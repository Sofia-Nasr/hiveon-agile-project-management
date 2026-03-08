using HiveonBackend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace HiveonBackend.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DashboardController(AppDbContext db)
        {
            _db = db;
        }

        private Guid GetWorkspaceId()
        {
            var wsClaim = User.FindFirst("workspaceId")?.Value;
            if (!Guid.TryParse(wsClaim, out var wsId))
                throw new UnauthorizedAccessException("Workspace not selected.");
            return wsId;
        }

        [HttpGet("pm")]
        public async Task<IActionResult> GetPmDashboard()
        {
            var wsId = GetWorkspaceId();

            var projectIds = await _db.Projects
                .Where(p => p.WorkspaceId == wsId)
                .Select(p => p.Id)
                .ToListAsync();

            var today = DateTime.UtcNow.Date;

            // ---------------- KPI ----------------

            var totalTickets =
                await _db.Tasks.CountAsync(t => projectIds.Contains(t.ProjectId)) +
                await _db.UserStories.CountAsync(s => projectIds.Contains(s.ProjectId));

            var productionBugs = await _db.Tasks.CountAsync(t =>
                projectIds.Contains(t.ProjectId) &&
                t.Type == "Bug" &&
                t.ProductionImpacted == true);

            var completedToday = await _db.Tasks.CountAsync(t =>
                projectIds.Contains(t.ProjectId) &&
                t.CompletedAt != null &&
                t.CompletedAt.Value.Date == today);

            var activeSprint = await _db.Sprints
                .Where(s => s.Status == "Active" && projectIds.Contains(s.ProjectId))
                .OrderByDescending(s => s.StartDate)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.StartDate,
                    s.EndDate
                })
                .FirstOrDefaultAsync();

            var velocity = 0;

            if (activeSprint != null)
            {
                velocity = await _db.Tasks
                    .Where(t =>
                        t.SprintId == activeSprint.Id &&
                        t.Status == "Done")
                    .SumAsync(t => t.StoryPoints ?? 0);
            }

            // ---------------- RISKS ----------------

            var risks = await _db.ProjectRisks
                .Where(r => r.WorkspaceId == wsId && r.Status != "Closed")
                .OrderByDescending(r => r.CreatedAt)
                .Take(5)
                .Select(r => new
                {
                    r.Id,
                    r.Title,
                    r.Probability,
                    r.Impact
                })
                .ToListAsync();

            // ---------------- MEETINGS ----------------

            var meetings = await _db.Meetings
                .Where(m =>
                    m.WorkspaceId == wsId &&
                    m.StartTime > DateTime.UtcNow &&
                    !m.IsCancelled)
                .OrderBy(m => m.StartTime)
                .Take(5)
                .Select(m => new
                {
                    m.Id,
                    m.Title,
                    m.StartTime
                })
                .ToListAsync();

            // ---------------- BURNDOWN ----------------

            var burndown = new List<object>();

            if (activeSprint != null)
            {
                var stories = await _db.UserStories
                    .Where(s => s.SprintId == activeSprint.Id)
                    .Select(s => new
                    {
                        s.StoryPoints,
                        s.Status
                    })
                    .ToListAsync();

                var totalPoints = stories.Sum(s => s.StoryPoints);
                var remaining = stories
                    .Where(s => s.Status != "Done")
                    .Sum(s => s.StoryPoints);

                burndown.Add(new { label = "Total", value = totalPoints });
                burndown.Add(new { label = "Remaining", value = remaining });
                burndown.Add(new { label = "Completed", value = totalPoints - remaining });
            }

            return Ok(new
            {
                cards = new
                {
                    tickets = totalTickets,
                    velocity,
                    productionBugs,
                    completedToday
                },
                activeSprint,
                risks,
                meetings,
                burndown
            });
        }
    }
}