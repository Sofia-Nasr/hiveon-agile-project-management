using HiveonBackend.Data;
using HiveonBackend.DTOs;
using HiveonBackend.Models;
using HiveonBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Text.Json;

namespace HiveonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MeetingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly GoogleCalendarService _googleCalendar;
        private readonly IConfiguration _config;

        public MeetingsController(AppDbContext context, GoogleCalendarService googleCalendar, IConfiguration config)
        {
            _context = context;
            _googleCalendar = googleCalendar;
            _config = config;
        }

        private bool TryGetUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(uid, out userId) && userId != Guid.Empty;
        }

        private bool TryGetWorkspaceId(out Guid workspaceId)
        {
            workspaceId = Guid.Empty;
            var wsClaim = User.FindFirst("workspaceId")?.Value;
            return Guid.TryParse(wsClaim, out workspaceId) && workspaceId != Guid.Empty;
        }

        /* ------------------------------------------------ */
        /* AUTO CLEANUP EXPIRED MEETINGS                    */
        /* ------------------------------------------------ */

        private async Task CleanupExpiredMeetings(Guid workspaceId)
        {
            var now = DateTime.UtcNow;

            var expired = await _context.Meetings
                .Where(m =>
                    m.WorkspaceId == workspaceId &&
                    !m.IsCancelled &&
                    m.EndTime < now)
                .ToListAsync();

            if (expired.Count == 0) return;

            foreach (var m in expired)
                m.IsCancelled = true;

            await _context.SaveChangesAsync();
        }

        /* ------------------------------------------------ */
        /* GET MEETINGS                                     */
        /* ------------------------------------------------ */

        [HttpGet]
        public async Task<IActionResult> GetMeetings()
        {
            if (!TryGetWorkspaceId(out var wsId))
                return Unauthorized();

            await CleanupExpiredMeetings(wsId);

            var now = DateTime.UtcNow;

            var meetings = await _context.Meetings
                .Where(m =>
                    m.WorkspaceId == wsId &&
                    !m.IsCancelled &&
                    m.EndTime >= now)
                .OrderBy(m => m.StartTime)
                .ToListAsync();

            return Ok(meetings);
        }

        /* ------------------------------------------------ */
        /* CREATE MEETING                                   */
        /* ------------------------------------------------ */

        [HttpPost]
        public async Task<IActionResult> CreateMeeting([FromBody] CreateMeetingDto dto)
        {
            try
            {
                if (!TryGetUserId(out var userId))
                    return Unauthorized("Invalid user.");

                var role = User.FindFirst(ClaimTypes.Role)?.Value;

                if (role != "ScrumMaster")
                    return Forbid("Only the Scrum Master can schedule meetings.");

                if (!TryGetWorkspaceId(out var wsId))
                    return Unauthorized("Workspace not selected.");

                if (dto == null)
                    return BadRequest("Invalid meeting payload.");

                if (string.IsNullOrWhiteSpace(dto.Title))
                    return BadRequest("Meeting title is required.");

                /* ---------------------------------------- */
                /* NORMALIZE TIME                           */
                /* ---------------------------------------- */

                dto.StartTime = dto.StartTime
                    .AddSeconds(-dto.StartTime.Second)
                    .AddMilliseconds(-dto.StartTime.Millisecond);

                dto.EndTime = dto.EndTime
                    .AddSeconds(-dto.EndTime.Second)
                    .AddMilliseconds(-dto.EndTime.Millisecond);

                var now = DateTime.UtcNow;

                if (dto.StartTime < now)
                    return BadRequest("Meeting cannot be scheduled in the past.");

                if (dto.StartTime < now.AddMinutes(2))
                    return BadRequest("Meetings must be scheduled at least 2 minutes in advance.");

                if (dto.StartTime >= dto.EndTime)
                    return BadRequest("End time must be after start time.");

                /* ---------------------------------------- */
                /* IGNORE EXPIRED MEETINGS BEFORE CHECK     */
                /* ---------------------------------------- */

                await CleanupExpiredMeetings(wsId);

                /* ---------------------------------------- */
                /* OVERLAP CHECK (JIRA STYLE)               */
                /* ---------------------------------------- */

                var conflict = await _context.Meetings
                    .Where(m =>
                        m.WorkspaceId == wsId &&
                        m.ProjectId == dto.ProjectId &&
                        !m.IsCancelled)
                    .Where(m =>
                        dto.StartTime < m.EndTime &&
                        dto.EndTime > m.StartTime)
                    .FirstOrDefaultAsync();

                if (conflict != null)
                {
                    return BadRequest($"Conflicts with meeting \"{conflict.Title}\" at {conflict.StartTime:HH:mm}");
                }

                /* ---------------------------------------- */
                /* USER                                     */
                /* ---------------------------------------- */

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                    return Unauthorized("User not found.");

                var googleConnection = await _context.GoogleConnections
       .FirstOrDefaultAsync(g => g.UserId == userId);

                if (googleConnection == null || string.IsNullOrEmpty(googleConnection.AccessToken))
                {
                    return BadRequest("Google account not connected.");
                }

                // Refresh access token if expired (or about to expire)
                if (googleConnection.ExpiresAt <= DateTime.UtcNow.AddMinutes(1))
                {
                    var refreshed = await TryRefreshGoogleAccessToken(googleConnection);
                    if (!refreshed)
                    {
                        return BadRequest("Google token expired or invalid. Please reconnect your Google account.");
                    }
                }

                /* ---------------------------------------- */
                /* PROJECT                                  */
                /* ---------------------------------------- */

                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.Id == dto.ProjectId && p.WorkspaceId == wsId);

                if (project == null)
                    return NotFound("Project not found in this workspace.");

                /* ---------------------------------------- */
                /* PARTICIPANTS                             */
                /* ---------------------------------------- */

                var participantIds = dto.ParticipantIds ?? new List<Guid>();

                var participants = await _context.WorkspaceUsers
                    .Where(wu => wu.WorkspaceId == wsId && participantIds.Contains(wu.UserId))
                    .Select(wu => new
                    {
                        Id = wu.UserId,
                        Email = wu.User.Email
                    })
                    .ToListAsync();

                var participantEmails = participants.Select(p => p.Email).ToList();

                /* ---------------------------------------- */
                /* CREATE GOOGLE MEET                       */
                /* ---------------------------------------- */

                string meetLink;

                try
                {
                    meetLink = await _googleCalendar.CreateMeetLink(
    googleConnection.AccessToken,
    dto.Title,
    dto.Description,
    dto.StartTime,
    dto.EndTime,
    participantEmails
);
                }
                catch (Exception ex)
                {
                    // If Google returned unauthorized, try refreshing once more
                    if (ex.Message != null && ex.Message.Contains("Unauthorized", StringComparison.OrdinalIgnoreCase))
                    {
                        var refreshed = await TryRefreshGoogleAccessToken(googleConnection);
                        if (refreshed)
                        {
                            try
                            {
                                meetLink = await _googleCalendar.CreateMeetLink(
    googleConnection.AccessToken,
    dto.Title,
    dto.Description,
    dto.StartTime,
    dto.EndTime,
    participantEmails
);
                            }
                            catch (Exception ex2)
                            {
                                return BadRequest(ex2.ToString());
                            }
                        }
                        else
                        {
                            return BadRequest("Google authorization failed and token refresh did not succeed.");
                        }
                    }

                    return BadRequest(ex.ToString());
                }

                /* ---------------------------------------- */
                /* SAVE MEETING                             */
                /* ---------------------------------------- */

                var meeting = new Meeting
                {
                    WorkspaceId = wsId,
                    ProjectId = dto.ProjectId,
                    Title = dto.Title.Trim(),
                    Description = dto.Description,
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    CreatedById = userId,
                    GoogleMeetLink = meetLink,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Meetings.Add(meeting);
                await _context.SaveChangesAsync();

                foreach (var p in participants)
                {
                    _context.MeetingParticipants.Add(new MeetingParticipant
                    {
                        MeetingId = meeting.Id,
                        UserId = p.Id
                    });
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    id = meeting.Id,
                    title = meeting.Title,
                    startTime = meeting.StartTime,
                    endTime = meeting.EndTime,
                    googleMeetLink = meeting.GoogleMeetLink
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.ToString());
            }
        }

        // Attempt to refresh Google access token using stored refresh token
        private async Task<bool> TryRefreshGoogleAccessToken(GoogleConnection conn)
        {
            try
            {
                if (conn == null || string.IsNullOrEmpty(conn.RefreshToken))
                    return false;

                var clientId = _config["Google:ClientId"];
                var clientSecret = _config["Google:ClientSecret"];

                using var http = new HttpClient();
                var request = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["client_id"] = clientId,
                    ["client_secret"] = clientSecret,
                    ["refresh_token"] = conn.RefreshToken,
                    ["grant_type"] = "refresh_token"
                });

                var resp = await http.PostAsync("https://oauth2.googleapis.com/token", request);
                if (!resp.IsSuccessStatusCode) return false;

                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                if (!doc.RootElement.TryGetProperty("access_token", out var accessTok)) return false;
                var accessToken = accessTok.GetString();

                var expiresIn = 3600;
                if (doc.RootElement.TryGetProperty("expires_in", out var exEl))
                {
                    try { expiresIn = exEl.GetInt32(); } catch { }
                }

                conn.AccessToken = accessToken ?? conn.AccessToken;
                conn.ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);

                _context.GoogleConnections.Update(conn);
                await _context.SaveChangesAsync();

                return true;
            }
            catch
            {
                return false;
            }
        }

        /* ------------------------------------------------ */
        /* DELETE MEETING                                   */
        /* ------------------------------------------------ */

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMeeting(Guid id)
        {
            if (!TryGetWorkspaceId(out var wsId))
                return Unauthorized();

            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            if (role != "ScrumMaster")
                return Forbid("Only the Scrum Master can delete meetings.");

            var meeting = await _context.Meetings
                .FirstOrDefaultAsync(m => m.Id == id && m.WorkspaceId == wsId);

            if (meeting == null)
                return NotFound();

            meeting.IsCancelled = true;

            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}