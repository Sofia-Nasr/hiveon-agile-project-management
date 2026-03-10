using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using HiveonBackend.Data;
using HiveonBackend.DTOs;
using HiveonBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HiveonBackend.Controllers
{
    [ApiController]
    [Route("api/sprints")]
    [Authorize]
    public class SprintsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public SprintsController(AppDbContext db) => _db = db;

        // ================= HELPERS =================
     
        private bool TryGetWorkspaceId(out Guid workspaceId, out IActionResult error)
        {
            workspaceId = Guid.Empty;
            error = null!;

            var wsClaim = User.FindFirst("workspaceId")?.Value;
            if (!Guid.TryParse(wsClaim, out workspaceId))
            {
                error = Unauthorized("Workspace not selected.");
                return false;
            }

            return true;
        }

        private Guid GetUserId()
        {
            var uid = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(uid, out var userId) || userId == Guid.Empty)
                throw new UnauthorizedAccessException("Invalid user.");
            return userId;
        }

        private Task<bool> ProjectInWorkspace(Guid projectId, Guid wsId, CancellationToken ct)
        {
            return _db.Projects.AnyAsync(p => p.Id == projectId && p.WorkspaceId == wsId, ct);
        }

        // ================= GET =================

        // GET /api/sprints?projectId=...
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] Guid projectId, CancellationToken ct)
        {
            if (projectId == Guid.Empty)
                return BadRequest("projectId is required.");

            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var existsProject = await ProjectInWorkspace(projectId, wsId, ct);
            if (!existsProject) return Forbid();

            var list = await _db.Sprints
                .AsNoTracking()
                .Where(s => s.ProjectId == projectId)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new SprintDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    Status = s.Status,
                    Goal = s.Goal,
                    TeamId = s.TeamId
                })
                .ToListAsync(ct);

            return Ok(list);
        }

        // ================= CREATE =================

        // POST /api/sprints
        [HttpPost]
        [Authorize(Roles = "ScrumMaster")]
        public async Task<IActionResult> Create([FromBody] CreateSprintDto dto, CancellationToken ct)
        {
            if (dto == null) return BadRequest("Body required.");

            // 🔒 DTO date validation (EndDate >= StartDate) happens via IValidatableObject
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (dto.ProjectId == Guid.Empty) return BadRequest("ProjectId is required.");
            if (dto.TeamId == Guid.Empty) return BadRequest("TeamId is required.");
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;

            var userId = GetUserId();

            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.Id == dto.ProjectId && p.WorkspaceId == wsId, ct);

            if (project == null) return Forbid();

            // team must belong to this project (and project already workspace-validated)
            var teamOk = await _db.Teams.AnyAsync(t => t.Id == dto.TeamId && t.ProjectId == dto.ProjectId, ct);
            if (!teamOk) return BadRequest("Invalid TeamId for this project.");

            var sprint = new Sprint
            {
                ProjectId = dto.ProjectId,
                TeamId = dto.TeamId,
                Name = dto.Name.Trim(),
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Goal = dto.Goal,
                Status = "Planned",
                CreatedById = userId
            };

            _db.Sprints.Add(sprint);
            await _db.SaveChangesAsync(ct);

            return Ok(new SprintDto
            {
                Id = sprint.Id,
                Name = sprint.Name,
                StartDate = sprint.StartDate,
                EndDate = sprint.EndDate,
                Status = sprint.Status,
                TeamId = sprint.TeamId
            });
        }

        // ================= LIFECYCLE =================

        // PATCH /api/sprints/{id}/start
        [HttpPatch("{id:guid}/start")]
        [Authorize(Roles = "ScrumMaster")]
        public async Task<IActionResult> Start(Guid id, CancellationToken ct)
        {
            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var sprint = await _db.Sprints
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s => s.Id == id && s.Project.WorkspaceId == wsId, ct);

            if (sprint == null) return NotFound();

            if (sprint.Status != "Planned")
                return BadRequest("Only planned sprints can be started.");

            // only one active sprint per project
            var activeExists = await _db.Sprints.AnyAsync(s =>
                s.ProjectId == sprint.ProjectId && s.Status == "Active", ct);

            if (activeExists)
                return BadRequest("An active sprint already exists for this project.");

            sprint.Status = "Active";
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }

        // PATCH /api/sprints/{id}/extend
        [HttpPatch("{id:guid}/extend")]
        [Authorize(Roles = "ScrumMaster")]
        public async Task<IActionResult> Extend(Guid id, [FromBody] UpdateSprintDatesDto dto, CancellationToken ct)
        {
            if (dto == null) return BadRequest("Body required.");

            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var sprint = await _db.Sprints
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s => s.Id == id && s.Project.WorkspaceId == wsId, ct);

            if (sprint == null) return NotFound();

            if (sprint.Status != "Active")
                return BadRequest("Only active sprints can be extended.");

            // ✅ enforce EndDate >= StartDate
            if (dto.EndDate.Date < sprint.StartDate.Date)
                return BadRequest("EndDate must be the same as or after StartDate.");

            sprint.EndDate = dto.EndDate;
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }

        // PATCH /api/sprints/{id}/complete
        [HttpPatch("{id:guid}/complete")]
        [Authorize(Roles = "ScrumMaster")]
        public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
        {
            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var sprint = await _db.Sprints
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s => s.Id == id && s.Project.WorkspaceId == wsId, ct);

            if (sprint == null) return NotFound();

            if (sprint.Status != "Active")
                return BadRequest("Only active sprints can be completed.");

            sprint.Status = "Completed";
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }

        // ================= SPRINT BACKLOG =================

        // GET /api/sprints/{id}/stories
        [HttpGet("{id:guid}/stories")]
        public async Task<IActionResult> GetSprintStories(Guid id, CancellationToken ct)
        {
            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var sprint = await _db.Sprints
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s => s.Id == id && s.Project.WorkspaceId == wsId, ct);

            if (sprint == null) return NotFound();

            var stories = await _db.UserStories
                .Where(us => us.SprintId == id)
                .OrderBy(us => us.Order)
                .Select(us => new
                {
                    id = us.Id,
                    title = us.Title,
                    status = us.Status,
                    storyPoints = us.StoryPoints,
                    order = us.Order,
                    assigneeId = us.AssigneeId
                })
                .ToListAsync(ct);

            return Ok(stories);
        }

        // POST /api/sprints/{id}/stories/add
        [HttpPost("{id:guid}/stories/add")]
        [Authorize(Roles = "ScrumMaster")]
        public async Task<IActionResult> AddStories(Guid id, [FromBody] SprintStoryIdsDto dto, CancellationToken ct)
        {
            if (dto?.StoryIds == null || dto.StoryIds.Count == 0)
                return BadRequest("StoryIds required.");

            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var sprint = await _db.Sprints
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s => s.Id == id && s.Project.WorkspaceId == wsId, ct);

            if (sprint == null) return NotFound();

            if (sprint.Status == "Completed")
                return BadRequest("Cannot modify a completed sprint.");

            var stories = await _db.UserStories
                .Where(us => dto.StoryIds.Contains(us.Id) && us.ProjectId == sprint.ProjectId)
                .ToListAsync(ct);

            foreach (var story in stories)
                story.SprintId = sprint.Id;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // POST /api/sprints/{id}/stories/remove
        [HttpPost("{id:guid}/stories/remove")]
        [Authorize(Roles = "ScrumMaster")]
        public async Task<IActionResult> RemoveStories(Guid id, [FromBody] SprintStoryIdsDto dto, CancellationToken ct)
        {
            if (dto?.StoryIds == null || dto.StoryIds.Count == 0)
                return BadRequest("StoryIds required.");

            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var sprint = await _db.Sprints
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s => s.Id == id && s.Project.WorkspaceId == wsId, ct);

            if (sprint == null) return NotFound();

            if (sprint.Status == "Completed")
                return BadRequest("Cannot modify a completed sprint.");

            var stories = await _db.UserStories
                .Where(us => dto.StoryIds.Contains(us.Id) && us.SprintId == sprint.Id)
                .ToListAsync(ct);

            foreach (var story in stories)
                story.SprintId = null;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // ================= BOARD =================

        // PATCH /api/sprints/{id}/reorder
        [HttpPatch("{id:guid}/reorder")]
        [Authorize(Roles = "Developer")]
        public async Task<IActionResult> Reorder(Guid id, [FromBody] SprintReorderDto dto, CancellationToken ct)
        {
            if (dto?.StoryIds == null || dto.StoryIds.Count == 0)
                return BadRequest("StoryIds required.");

            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var sprintOk = await _db.Sprints.AnyAsync(s => s.Id == id && s.Project.WorkspaceId == wsId, ct);
            if (!sprintOk) return Forbid();

            var stories = await _db.UserStories
                .Where(us => us.SprintId == id)
                .ToListAsync(ct);

            for (int i = 0; i < dto.StoryIds.Count; i++)
            {
                var story = stories.FirstOrDefault(s => s.Id == dto.StoryIds[i]);
                if (story != null) story.Order = i;
            }

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // GET /api/sprints/{sprintId}/board
        [HttpGet("{sprintId:guid}/board")]
        public async Task<IActionResult> GetSprintBoard(
            Guid sprintId,
            [FromQuery] string? type,
            [FromQuery] Guid? assigneeId)
        {
            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var sprint = await _db.Sprints
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s =>
                    s.Id == sprintId &&
                    s.Project.WorkspaceId == wsId);

            if (sprint == null) return NotFound();

            var query = _db.Tasks
                .Where(t => t.SprintId == sprintId);

            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(t => t.Type == type);

            if (assigneeId.HasValue)
                query = query.Where(t => t.AssigneeId == assigneeId);

            var tasks = await query
                .OrderBy(t => t.Status)
                .ThenBy(t => t.Order)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Type,
                    t.Status,
                    t.Priority,
                    t.Order,
                    assignee = t.Assignee == null ? null : new
                    {
                        t.Assignee.Id,
                        t.Assignee.Username
                    }
                })
                .ToListAsync();

            return Ok(tasks);
        }

        [HttpPatch("{sprintId}/assign")]
        [Authorize(Roles = "ScrumMaster,ProductOwner")]
        public async Task<IActionResult> AssignToSprint(
            Guid sprintId,
            [FromBody] Guid[] ticketIds,
            CancellationToken ct)
        {
            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;


            var sprint = await _db.Sprints
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s =>
                    s.Id == sprintId &&
                    s.Project.WorkspaceId == wsId,
                    ct);

            if (sprint == null) return NotFound();
            if (sprint.Status == "Completed")
                return BadRequest("Sprint is completed.");

            // ✅ FIXED: validate stories belong to same project
            var stories = await _db.UserStories
                .Where(us =>
                    ticketIds.Contains(us.Id) &&
                    us.ProjectId == sprint.ProjectId)
                .ToListAsync(ct);

            foreach (var story in stories)
            {
                story.SprintId = sprintId;
                story.Status = "To Do";
            }

            // tasks (bugs / support)
            var tasks = await _db.Tasks
                .Where(t =>
                    ticketIds.Contains(t.Id) &&
                    t.ProjectId == sprint.ProjectId)
                .ToListAsync(ct);

            foreach (var task in tasks)
                task.SprintId = sprintId;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }


        [HttpPatch("stories/{storyId:guid}/status")]
        [Authorize(Roles = "Developer")]
        public async Task<IActionResult> UpdateStoryStatus(
      Guid storyId,
      [FromBody] UpdateStoryStatusDto dto,
      CancellationToken ct)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Status))
                return BadRequest("Status is required.");

            var allowedStatuses = new[]
            {
        "To Do",
        "In Progress",
        "Testing",
        "In Review",
        "Blocked",
        "Done"
    };

            if (!allowedStatuses.Contains(dto.Status))
                return BadRequest("Invalid status value.");

            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;

            var story = await _db.UserStories
                .Include(us => us.Sprint)
                    .ThenInclude(s => s.Project)
                .FirstOrDefaultAsync(us =>
                    us.Id == storyId &&
                    us.Project.WorkspaceId == wsId,
                    ct);

            if (story == null)
                return NotFound();

            if (story.SprintId == null)
                return BadRequest("Story is not assigned to a sprint.");

            if (story.Sprint!.Status == "Completed")
                return BadRequest("Cannot modify stories in a completed sprint.");

            story.Status = dto.Status;
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }

       



    }
}
