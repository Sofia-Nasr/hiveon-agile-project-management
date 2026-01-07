using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using HiveonBackend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HiveonBackend.Controllers
{
    // unified DTO for all backlog rows
    public class BacklogItemDto
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public string Priority { get; set; } = "Medium";
        public int Order { get; set; }
        public string Status { get; set; } = "To Do";
        public Guid? EpicId { get; set; }
        public int? StoryPoints { get; set; }
        public Guid? AssigneeId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string TicketType { get; set; } = "";

        // Epic fields
        public int? EffortEstimate { get; set; }
        public decimal? RevenueImpact { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        // User story fields
        public string? AcceptanceCriteria { get; set; }
        public DateTime? PlannedStart { get; set; }
        public DateTime? PlannedEnd { get; set; }

        // Bug / Support fields
        public string? Severity { get; set; }
        public string? Probability { get; set; }
        public string? Environment { get; set; }
        public bool? BuildCrash { get; set; }
        public bool? ProductionImpacted { get; set; }
        public DateTime? TrendingEndDate { get; set; }
        public string? Type { get; set; }
    }

    public class SetPriorityDto
    {
        public string Priority { get; set; } = "";
    }

    public class BacklogReorderDto
    {
        public Guid ProjectId { get; set; }
        public Guid[] StoryIds { get; set; } = Array.Empty<Guid>();
    }

    [ApiController]
    [Route("api/backlog")]
    public class BacklogController : ControllerBase
    {
        private readonly AppDbContext _db;
        public BacklogController(AppDbContext db) => _db = db;

        // ================= HELPERS =================
        private Guid GetWorkspaceId()
        {
            var wsClaim = User.FindFirst("workspaceId")?.Value;
            if (!Guid.TryParse(wsClaim, out var wsId))
                throw new UnauthorizedAccessException("Workspace not selected.");
            return wsId;
        }

        private Task<bool> ProjectInWorkspace(Guid projectId, Guid wsId, CancellationToken ct)
        {
            return _db.Projects.AnyAsync(
                p => p.Id == projectId && p.WorkspaceId == wsId,
                ct);
        }

        // ============================================================
        // GET /api/backlog?projectId=...
        // ============================================================
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> Get([FromQuery] Guid projectId, CancellationToken ct)
        {
            if (projectId == Guid.Empty)
                return BadRequest("projectId is required.");

            var wsId = GetWorkspaceId();

            // 🔒 workspace enforcement
            var projectOk = await ProjectInWorkspace(projectId, wsId, ct);
            if (!projectOk) return Forbid();

            // ---- EPICS --------------------------------------------------
            var epics = await _db.Epics
                .AsNoTracking()
                .Where(e => e.ProjectId == projectId)
                .OrderBy(e => e.Title)
                .Select(e => new BacklogItemDto
                {
                    Id = e.Id,
                    ProjectId = e.ProjectId,
                    Title = e.Title,
                    Description = e.Description,
                    Priority = e.Priority ?? "Medium",
                    Order = 0,
                    Status = e.Status ?? "To Do",
                    EpicId = null,
                    StoryPoints = null,
                    AssigneeId = e.AssigneeId,
                    CreatedAt = e.CreatedAt,
                    TicketType = "Epic",

                    EffortEstimate = e.EffortEstimate,
                    RevenueImpact = e.RevenueImpact,
                    StartDate = e.StartDate,
                    EndDate = e.EndDate
                })
                .ToListAsync(ct);

            // ---- USER STORIES ------------------------------------------
            var stories = await _db.UserStories
         .AsNoTracking()
         .Where(s =>
             s.ProjectId == projectId &&
             s.SprintId == null
         )
                     .OrderBy(s => s.Order)
                .ThenBy(s => s.CreatedAt)
                .Select(s => new BacklogItemDto
                {
                    Id = s.Id,
                    ProjectId = s.ProjectId,
                    Title = s.Title,
                    Description = s.Description,
                    Priority = s.Priority ?? "Low",
                    Order = s.Order,
                    Status = s.Status ?? "To Do",
                    EpicId = s.EpicId,
                    StoryPoints = s.StoryPoints,
                    AssigneeId = s.AssigneeId,
                    CreatedAt = s.CreatedAt,
                    TicketType = "UserStory",

                    AcceptanceCriteria = s.AcceptanceCriteria,
                    PlannedStart = s.PlannedStart,
                    PlannedEnd = s.PlannedEnd
                })
                .ToListAsync(ct);

            // ---- BUG + SUPPORT TASKS -----------------------------------
            var tasks = await _db.Tasks
        .AsNoTracking()
        .Where(t =>
            t.ProjectId == projectId &&
            t.SprintId == null
        )
                    .OrderBy(t => t.CreatedAt)
                .Select(t => new BacklogItemDto
                {
                    Id = t.Id,
                    ProjectId = t.ProjectId,
                    Title = t.Title,
                    Description = t.Description,
                    Priority = t.Priority ?? "Medium",
                    Order = 10_000,
                    Status = t.Status ?? "To Do",
                    EpicId = null,
                    StoryPoints = t.StoryPoints,
                    AssigneeId = t.AssigneeId,
                    CreatedAt = t.CreatedAt,
                    TicketType = t.IsBug ? "Bug" : "Support",

                    Severity = t.BugSeverity.ToString(),
                    Probability = t.BugProbability.ToString(),
                    Environment = t.ReportedEnvironment.ToString(),
                    BuildCrash = t.BuildCrash,
                    ProductionImpacted = t.ProductionImpacted,
                    TrendingEndDate = t.TrendingEndDate,
                    Type = t.Type
                })
                .ToListAsync(ct);

            var items = epics
                .Concat(stories)
                .Concat(tasks)
                .OrderBy(x => x.Order)
                .ThenBy(x => x.CreatedAt)
                .ToList();

            return Ok(items);
        }

        // ============================================================
        // PATCH /api/backlog/reorder
        // ============================================================
        [HttpPatch("reorder")]
        [Authorize(Roles = "ProductOwner")]
        public async Task<IActionResult> Reorder([FromBody] BacklogReorderDto dto, CancellationToken ct)
        {
            if (dto == null || dto.ProjectId == Guid.Empty)
                return BadRequest("ProjectId is required.");

            var wsId = GetWorkspaceId();

            // 🔒 workspace enforcement
            var projectOk = await ProjectInWorkspace(dto.ProjectId, wsId, ct);
            if (!projectOk) return Forbid();

            var stories = await _db.UserStories
                .Where(s => s.ProjectId == dto.ProjectId)
                .ToListAsync(ct);

            if (!stories.Any())
                return NoContent();

            var storyById = stories.ToDictionary(s => s.Id, s => s);

            int position = 0;
            foreach (var id in dto.StoryIds)
            {
                if (storyById.TryGetValue(id, out var story))
                {
                    story.Order = position++;
                }
            }

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // ============================================================
        // PATCH /api/backlog/{id}/priority
        // ============================================================
        [HttpPatch("{id:guid}/priority")]
        [Authorize]
        public async Task<IActionResult> SetPriority(Guid id, [FromBody] SetPriorityDto dto, CancellationToken ct)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Priority))
                return BadRequest("Priority is required.");

            var wsId = GetWorkspaceId();
            string newP = dto.Priority.Trim();

            // UserStory
            var story = await _db.UserStories
                .FirstOrDefaultAsync(
                    s => s.Id == id && s.Project.WorkspaceId == wsId,
                    ct);

            if (story != null)
            {
                story.Priority = newP;
                await _db.SaveChangesAsync(ct);
                return NoContent();
            }

            // Epic
            var epic = await _db.Epics
                .FirstOrDefaultAsync(
                    e => e.Id == id && e.Project.WorkspaceId == wsId,
                    ct);

            if (epic != null)
            {
                epic.Priority = newP;
                await _db.SaveChangesAsync(ct);
                return NoContent();
            }

            // Bug / Support Task
            var task = await _db.Tasks
                .FirstOrDefaultAsync(
                    t => t.Id == id && t.Project.WorkspaceId == wsId,
                    ct);

            if (task != null)
            {
                task.Priority = newP;
                await _db.SaveChangesAsync(ct);
                return NoContent();
            }

            return NotFound("Backlog item not found.");
        }
    }
}
