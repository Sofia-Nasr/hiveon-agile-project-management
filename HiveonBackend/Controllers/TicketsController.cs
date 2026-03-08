using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using HiveonBackend.Data;
using HiveonBackend.Dtos;
using HiveonBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

// Only alias the enums we actually have
using IssueSeverityEnum = HiveonBackend.Models.IssueSeverity;
using BugProbabilityEnum = HiveonBackend.Models.BugProbability;
using BugEnvironmentEnum = HiveonBackend.Models.BugEnvironment;

namespace HiveonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TicketsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private static readonly string[] TicketTypes = new[] { "Epic", "UserStory", "Bug", "Support" };

        public TicketsController(AppDbContext db)
        {
            _db = db;
        }

        // HELPERS 
        private Guid GetWorkspaceId()
        {
            var wsClaim = User.FindFirst("workspaceId")?.Value;
            if (!Guid.TryParse(wsClaim, out var wsId))
                throw new UnauthorizedAccessException("Workspace not selected.");
            return wsId;
        }

        // List allowed types
        [HttpGet("types")]
        [AllowAnonymous]
        public IActionResult GetTypes() => Ok(TicketTypes);

        //  UNIFIED CREATE 
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTicketRequest dto)
        {
            if (dto == null) return BadRequest("Payload required.");
            if (dto.ProjectId == Guid.Empty) return BadRequest("ProjectId is required.");
            if (string.IsNullOrWhiteSpace(dto.Type)) return BadRequest("Type is required.");
            if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var wsId = GetWorkspaceId();

            //  workspace enforcement via project
            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.Id == dto.ProjectId && p.WorkspaceId == wsId);

            if (project == null)
                return Forbid("Project not found in active workspace.");

            // role from JWT
            var role = User?.FindFirst(ClaimTypes.Role)?.Value
                       ?? User?.FindFirst("role")?.Value
                       ?? "";

            // only PO/SM can create epics
            if (dto.Type == "Epic" && role != "ProductOwner" && role != "ScrumMaster")
                return Forbid("Only ProductOwner or ScrumMaster can create epics.");

            return dto.Type switch
            {
                "Epic" => await CreateEpic(dto),
                "UserStory" => await CreateUserStory(dto),
                "Bug" => await CreateBug(dto),
                "Support" => await CreateSupportTask(dto),
                _ => BadRequest("Unknown ticket type. Allowed: Epic, UserStory, Bug, Support.")
            };
        }

        // ------------------- EPIC -------------------
        private async Task<IActionResult> CreateEpic(CreateTicketRequest dto)
        {
            var epic = new Epic
            {
                ProjectId = dto.ProjectId,
                Title = dto.Title.Trim(),
                Description = dto.Description,
                Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority!,
                Status = "To Do",
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                EffortEstimate = dto.EffortEstimate,
                RevenueImpact = dto.RevenueImpact,
                ProductOwnerId = dto.ProductOwnerId,
                AssigneeId = dto.AssigneeId
            };

            _db.Epics.Add(epic);
            await _db.SaveChangesAsync();

            return Created($"/api/epic/{epic.Id}", epic);
        }

        // ------------------- USER STORY -------------------
        private async Task<IActionResult> CreateUserStory(CreateTicketRequest dto)
        {
            var story = new UserStory
            {
                Id = Guid.NewGuid(),
                ProjectId = dto.ProjectId,
                EpicId = dto.EpicId,
                Title = dto.Title.Trim(),
                Description = dto.Description,
                Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Low" : dto.Priority!,
                StoryPoints = dto.StoryPoints ?? 0,
                AcceptanceCriteria = dto.AcceptanceCriteria,
                PlannedStart = dto.PlannedStart,
                PlannedEnd = dto.PlannedEnd,
                Status = "To Do",
                AssigneeId = dto.AssigneeId,
                SprintId = dto.SprintId
            };

            _db.UserStories.Add(story);
            await _db.SaveChangesAsync();

            return Created($"/api/userstories/{story.Id}", story);
        }

        // ------------------- BUG -------------------
        private async Task<IActionResult> CreateBug(CreateTicketRequest dto)
        {
            var bug = new TaskItem
            {
                Id = Guid.NewGuid(),
                ProjectId = dto.ProjectId,
                TeamId = dto.TeamId,
                SprintId = dto.SprintId,
                AssigneeId = dto.AssigneeId,
                Title = dto.Title.Trim(),
                Description = dto.Description,
                Type = "Bug",
                Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority!,
                Status = "To Do",

                StoryPoints = dto.StoryPoints ?? 0,

                BugSeverity = TicketParsers.ParseSeverity(dto.Severity),
                BugProbability = TicketParsers.ParseProbability(dto.Probability),
                ReportedEnvironment = TicketParsers.ParseEnvironment(dto.Environment),

                BuildCrash = dto.BuildCrash,
                ProductionImpacted = dto.ProductionImpacted,

                PlannedStart = dto.PlannedStart,
                PlannedEnd = dto.PlannedEnd,
                TrendingEndDate = dto.TrendingEndDate
            };

            _db.Tasks.Add(bug);
            await _db.SaveChangesAsync();

            // AUTO ESCALATION RULE (preserved)
            if (bug.BugSeverity == IssueSeverityEnum.High &&
                bug.BugProbability == BugProbabilityEnum.P1)
            {
                // TODO: notify PO/SM
            }

            return Created($"/api/tasks/{bug.Id}", bug);
        }

        // ------------------- SUPPORT TASK -------------------
        private async Task<IActionResult> CreateSupportTask(CreateTicketRequest dto)
        {
            var task = new TaskItem
            {
                Id = Guid.NewGuid(),
                ProjectId = dto.ProjectId,
                TeamId = dto.TeamId,
                SprintId = dto.SprintId,
                AssigneeId = dto.AssigneeId,
                Title = dto.Title.Trim(),
                Description = dto.Description,
                Type = "Support",
                Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority!,
                Status = "To Do",
                StoryPoints = dto.StoryPoints ?? 0,
                PlannedStart = dto.PlannedStart,
                PlannedEnd = dto.PlannedEnd
            };

            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();

            return Created($"/api/tasks/{task.Id}", task);
        }


        // PATCH /api/tickets/{id}/status
        [HttpPatch("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(
            Guid id,
            [FromBody] string status)
        {
            var allowed = new[]
            {
        "To Do",
        "In Progress",
        "Testing",
        "In Review",
        "Done",
        "Blocked"
    };

            if (!allowed.Contains(status))
                return BadRequest("Invalid status.");

            var task = await _db.Tasks.FindAsync(id);
            if (task == null) return NotFound();

            task.Status = status;

            if (status == "Done")
                task.CompletedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/tasks?projectId=...
        [HttpGet("/api/tasks")]
        public async Task<IActionResult> GetTasks([FromQuery] Guid projectId)
        {
            if (projectId == Guid.Empty)
                return BadRequest("projectId is required.");

            var wsId = GetWorkspaceId();

            var projectExists = await _db.Projects
                .AnyAsync(p => p.Id == projectId && p.WorkspaceId == wsId);

            if (!projectExists)
                return Forbid();

            var tasks = await _db.Tasks
                .Where(t => t.ProjectId == projectId)
                .Include(t => t.Assignee)
                .OrderBy(t => t.Order)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Type,
                    t.Status,
                    t.Priority,
                    t.SprintId,
                    t.AssigneeId,
                    assigneeName = t.Assignee != null
    ? t.Assignee.Username ?? t.Assignee.Name
    : null,
                    assigneeEmail = t.Assignee != null
    ? t.Assignee.Email
    : null,

                    t.TeamId,
                    t.StoryPoints,
                    t.Order,

                    // 🐞 BUG FIELDS
                    severity = t.BugSeverity != null ? t.BugSeverity.ToString() : null,
                    probability = t.BugProbability != null ? t.BugProbability.ToString() : null,
                    environment = t.ReportedEnvironment != null ? t.ReportedEnvironment.ToString() : null,
                    t.BuildCrash,
                    t.ProductionImpacted,
                    t.TrendingEndDate,

                    // 🛠 PLANNING
                    t.PlannedStart,
                    t.PlannedEnd,

                    t.CreatedAt
                })
                .ToListAsync();

            return Ok(tasks);
        }



        // PATCH /api/tickets/reorder
        [HttpPatch("reorder")]
        public async Task<IActionResult> Reorder([FromBody] Guid[] orderedIds)
        {
            for (int i = 0; i < orderedIds.Length; i++)
            {
                var task = await _db.Tasks.FindAsync(orderedIds[i]);
                if (task != null)
                    task.Order = i;
            }

            await _db.SaveChangesAsync();
            return NoContent();
        }


    }
}
