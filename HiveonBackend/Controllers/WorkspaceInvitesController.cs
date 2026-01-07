using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using HiveonBackend.Data;
using HiveonBackend.DTOs;
using HiveonBackend.Models;
using HiveonBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HiveonBackend.Controllers
{
    [ApiController]
    [Route("api/workspace/invites")]
    public class WorkspaceInvitesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly IEmailService _emailService;

        public WorkspaceInvitesController(
            AppDbContext db,
            IConfiguration config,
            IEmailService emailService
        )
        {
            _db = db;
            _config = config;
            _emailService = emailService;
        }

        // ======================================================
        // POST: /api/workspace/invites/send
        // ======================================================
        [HttpPost("send")]
        [Authorize]
        public async Task<IActionResult> SendInvite([FromBody] WorkspaceInviteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var inviterIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var workspaceIdStr = User.FindFirst("workspaceId")?.Value;

            if (!Guid.TryParse(inviterIdStr, out var inviterId) ||
                !Guid.TryParse(workspaceIdStr, out var workspaceId))
            {
                return Unauthorized("Invalid user or workspace context.");
            }

            // 🔒 ONLY ProductOwner can invite
            var inviter = await _db.WorkspaceUsers.FirstOrDefaultAsync(wu =>
                wu.WorkspaceId == workspaceId &&
                wu.UserId == inviterId &&
                wu.Role == "ProductOwner");

            if (inviter == null)
                return StatusCode(403, "Only Product Owners can invite users.");


            var workspace = await _db.Workspaces
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == workspaceId);

            if (workspace == null)
                return NotFound("Workspace not found.");

            // Prevent duplicate membership
            var alreadyMember = await _db.WorkspaceUsers.AnyAsync(wu =>
                wu.WorkspaceId == workspaceId &&
                wu.User.Email == dto.Email);

            if (alreadyMember)
                return BadRequest("User already belongs to this workspace.");

            // Validate role
            var allowedRoles = new[]
            {
                "ScrumMaster",
                "Developer"
            };

            if (!allowedRoles.Contains(dto.Role))
                return BadRequest("Invalid role.");

            var token = Guid.NewGuid().ToString("N");
            var joinCode = GenerateJoinCode();

            var invite = new WorkspaceInvitation
            {
                WorkspaceId = workspaceId,
                Email = dto.Email.Trim().ToLower(),
                Role = dto.Role,
                Token = token,
                JoinCode = joinCode,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                IsAccepted = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.WorkspaceInvitations.Add(invite);
            await _db.SaveChangesAsync();

            var inviteUrl =
                $"{_config["Frontend:BaseUrl"]}/invite?token={token}";

            // ✅ Send email with BOTH token link and join code
            await _emailService.SendInviteEmail(
      invite.Email,
      workspace.Name,
      inviteUrl,
      invite.JoinCode,
      invite.Role
  );


            return Ok(new { message = "Invitation sent." });
        }

        // ======================================================
        // POST: /api/workspace/invites/accept
        // ======================================================
        [HttpPost("accept")]
        [Authorize]
        public async Task<IActionResult> AcceptInvite([FromBody] AcceptInviteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized("Invalid user.");

            var invite = await _db.WorkspaceInvitations.FirstOrDefaultAsync(i =>
                i.Token == dto.Token && !i.IsAccepted);

            if (invite == null)
                return NotFound("Invite not found or already used.");

            if (invite.ExpiresAt < DateTime.UtcNow)
                return BadRequest("Invite has expired.");

            var alreadyMember = await _db.WorkspaceUsers.AnyAsync(wu =>
                wu.WorkspaceId == invite.WorkspaceId &&
                wu.UserId == userId);

            if (!alreadyMember)
            {
                _db.WorkspaceUsers.Add(new WorkspaceUser
                {
                    WorkspaceId = invite.WorkspaceId,
                    UserId = userId,
                    Role = invite.Role,
                    JoinedAt = DateTime.UtcNow
                });
            }

            invite.IsAccepted = true;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                workspaceId = invite.WorkspaceId,
                role = invite.Role
            });
        }

        // ======================================================
        // JOIN CODE GENERATOR
        // ======================================================
        private static string GenerateJoinCode()
        {
            return "HIVE-" + Guid.NewGuid()
                .ToString("N")
                .Substring(0, 6)
                .ToUpper();
        }
    }
}
