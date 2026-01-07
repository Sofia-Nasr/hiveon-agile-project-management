using System;
using Microsoft.Extensions.Logging;
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
    [Route("api/userstories")]
    public class UserStoriesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public UserStoriesController(AppDbContext db) => _db = db;

        // GET: /api/userstories?projectId=...&epicId=...&status=...&sprintId=...
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> Get(
            [FromQuery] Guid projectId,
            [FromQuery] Guid? epicId,
            [FromQuery] string? status,
            [FromQuery] Guid? sprintId,
            CancellationToken ct)
        {
            if (projectId == Guid.Empty) return BadRequest("projectId is required.");

            var q = _db.UserStories.AsNoTracking().Where(s => s.ProjectId == projectId);

            if (epicId.HasValue) q = q.Where(s => s.EpicId == epicId.Value);
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(s => s.Status == status);
            if (sprintId.HasValue) q = q.Where(s => s.SprintId == sprintId.Value);

            var list = await _db.UserStories
     .AsNoTracking()
     .Include(s => s.Assignee)   
     .Include(s => s.Epic)
     .Include(s => s.Sprint)
     .Where(s => s.ProjectId == projectId)
     .Select(s => new UserStoryDto
     {
         Id = s.Id,
         ProjectId = s.ProjectId,

         EpicId = s.EpicId,
         EpicName = s.Epic != null ? s.Epic.Title : null,

         SprintId = s.SprintId,
         SprintName = s.Sprint != null ? s.Sprint.Name : null,

         Title = s.Title,
         Description = s.Description,
         AcceptanceCriteria = s.AcceptanceCriteria,

         TargetForSprint = s.TargetForSprint, // ✅ THIS

         StoryPoints = s.StoryPoints,
         Order = s.Order,
         Priority = s.Priority,
         Status = s.Status,

         AssigneeId = s.AssigneeId,
         AssigneeName = s.Assignee != null ? s.Assignee.Username : null,


         CreatedAt = s.CreatedAt
     })

      .OrderBy(s => s.Order)
      .ToListAsync(ct);




            return Ok(list);
        }

        // --- DTOs (kept here for now; move to DTOs/ when you like)
        public class CreateUserStoryDto
        {
            public Guid ProjectId { get; set; }
            public Guid? EpicId { get; set; }
            public Guid? SprintId { get; set; }            // allow direct creation in a sprint
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string Priority { get; set; } = "Medium"; // High/Medium/Low
            public int StoryPoints { get; set; } = 0;
            public string? TargetForSprint { get; set; }
            public string? AcceptanceCriteria { get; set; }
            public Guid? AssigneeId { get; set; }
        }

        public class UpdateUserStoryDto
        {
            public Guid? EpicId { get; set; }

            public string? Title { get; set; }
            public string? Description { get; set; }

            public string? Priority { get; set; } // High / Medium / Low
            public int? StoryPoints { get; set; }

            
            public string? TargetForSprint { get; set; }

            public string? AcceptanceCriteria { get; set; }
        }

        // POST: /api/userstories  (PO + SM)
        [HttpPost]
        [Authorize(Roles = "ProductOwner,ScrumMaster")]
        public async Task<IActionResult> Create([FromBody] CreateUserStoryDto dto, CancellationToken ct)
        {
            if (dto == null) return BadRequest("Body required.");
            if (dto.ProjectId == Guid.Empty) return BadRequest("ProjectId is required.");
            if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");
            if (dto.Priority is not ("High" or "Medium" or "Low"))
                return BadRequest("Priority must be High, Medium, or Low.");

            // Append to end of the chosen bucket (sprint or backlog)
            int nextOrder;
            if (dto.SprintId.HasValue)
            {
                nextOrder = await _db.UserStories
                    .Where(s => s.SprintId == dto.SprintId.Value)
                    .MaxAsync(s => (int?)s.Order, ct) ?? -1;
            }
            else
            {
                nextOrder = await _db.UserStories
                    .Where(s => s.ProjectId == dto.ProjectId && s.SprintId == null)
                    .MaxAsync(s => (int?)s.Order, ct) ?? -1;
            }

            var s = new UserStory
            {
                ProjectId = dto.ProjectId,
                EpicId = dto.EpicId,
                SprintId = dto.SprintId,

                Title = dto.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(dto.Description)
         ? null
         : dto.Description.Trim(),

                AcceptanceCriteria = string.IsNullOrWhiteSpace(dto.AcceptanceCriteria)
         ? null
         : dto.AcceptanceCriteria.Trim(),

                TargetForSprint = string.IsNullOrWhiteSpace(dto.TargetForSprint)
         ? null
         : dto.TargetForSprint.Trim(),

                Priority = dto.Priority,
                StoryPoints = dto.StoryPoints,

                AssigneeId = dto.AssigneeId,

                Order = nextOrder + 1,
                Status = "To Do"
            };



            _db.UserStories.Add(s);
            await _db.SaveChangesAsync(ct);

            var result = new UserStoryDto
            {
                Id = s.Id,
                ProjectId = s.ProjectId,
                EpicId = s.EpicId,
                SprintId = s.SprintId,      
                Title = s.Title,
                Description = s.Description,
                StoryPoints = s.StoryPoints,
                Order = s.Order,
                Priority = s.Priority,
                Status = s.Status,
                CreatedAt = s.CreatedAt
            };

            return CreatedAtAction(nameof(Get), new { projectId = s.ProjectId }, result);
        }

        // PUT: /api/userstories/{id}  (PO + SM)
        [HttpPut("{id:guid}")]
        [Authorize(Roles = "ProductOwner,ScrumMaster")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserStoryDto dto, CancellationToken ct)
        {
            var s = await _db.UserStories.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) return NotFound();
            if (dto.TargetForSprint != null)
                s.TargetForSprint = dto.TargetForSprint.Trim();

            if (dto.AcceptanceCriteria != null)
                s.AcceptanceCriteria = dto.AcceptanceCriteria.Trim();

            if (dto.Title != null) s.Title = dto.Title.Trim();
            if (dto.Description != null) s.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            if (dto.EpicId.HasValue) s.EpicId = dto.EpicId;
            if (dto.Priority != null)
            {
                if (dto.Priority is not ("High" or "Medium" or "Low"))
                    return BadRequest("Priority must be High, Medium, or Low.");
                s.Priority = dto.Priority;
            }
            if (dto.StoryPoints.HasValue) s.StoryPoints = dto.StoryPoints.Value;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE: /api/userstories/{id}  (PO only)
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "ProductOwner")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var s = await _db.UserStories.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) return NotFound();
            _db.UserStories.Remove(s);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // PATCH: /api/userstories/{id}/status  (any role)
        public record StatusDto(string Status);

        [HttpPatch("{id:guid}/status")]
        [Authorize]
        public async Task<IActionResult> SetStatus(Guid id, [FromBody] StatusDto dto, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(dto.Status))
                return BadRequest("Status is required.");

            var s = await _db.UserStories.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) return NotFound();

            s.Status = dto.Status.Trim();
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // PATCH: /api/userstories/assign-to-sprint
        [HttpPatch("assign-to-sprint")]
        [Authorize(Roles = "ProductOwner,ScrumMaster")]
        public async Task<IActionResult> AssignToSprint(
            [FromBody] AssignStoriesToSprintDto dto,
            CancellationToken ct)
        {
            if (dto.SprintId == Guid.Empty)
                return BadRequest("SprintId is required.");

            if (dto.UserStoryIds == null || dto.UserStoryIds.Count == 0)
                return BadRequest("No user stories selected.");

            var stories = await _db.UserStories
                .Where(s => dto.UserStoryIds.Contains(s.Id))
                .ToListAsync(ct);

            foreach (var story in stories)
            {
                story.SprintId = dto.SprintId;
                story.Status = "To Do"; // Jira-style default
            }

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        public class AssignStoriesToSprintDto
        {
            public Guid SprintId { get; set; }
            public List<Guid> UserStoryIds { get; set; } = new();
        }


        // PATCH: /api/userstories/{id}/assignee
        public record AssignDto(Guid AssigneeId);

        [HttpPatch("{id:guid}/assignee")]
        [Authorize]
        public async Task<IActionResult> SetAssignee(Guid id, [FromBody] AssignDto dto, CancellationToken ct)
        {
            var s = await _db.UserStories.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) return NotFound();

            var role = User.FindFirstValue(ClaimTypes.Role) ?? "";
            var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid.TryParse(currentUserIdStr, out var currentUserId);

            var isPO = role == "ProductOwner";
            var isSM = role == "ScrumMaster";
            var isDev = role == "Developer";

            if (isPO || isSM)
            {
                s.AssigneeId = dto.AssigneeId;
            }
            else if (isDev)
            {
                if (dto.AssigneeId != Guid.Empty && dto.AssigneeId != currentUserId)
                    return Forbid();
                s.AssigneeId = dto.AssigneeId == Guid.Empty ? null : dto.AssigneeId;
            }
            else
            {
                return Forbid();
            }

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
