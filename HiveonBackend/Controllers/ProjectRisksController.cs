using HiveonBackend.Data;
using HiveonBackend.DTOs;
using HiveonBackend.Models;
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
    [Route("api/risks")]
    public class ProjectRisksController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ProjectRisksController(AppDbContext db) => _db = db;

        // Helpers 
        private bool TryGetUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var uid = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(uid, out userId) && userId != Guid.Empty;
        }

        private bool TryGetWorkspaceId(out Guid workspaceId)
        {
            workspaceId = Guid.Empty;
            var wsClaim = User.FindFirst("workspaceId")?.Value;
            return Guid.TryParse(wsClaim, out workspaceId) && workspaceId != Guid.Empty;
        }

        private async Task<bool> IsWorkspaceMember(Guid workspaceId, Guid userId)
        {
            return await _db.WorkspaceUsers.AnyAsync(wu =>
                wu.WorkspaceId == workspaceId &&
                wu.UserId == userId
            );
        }

        private static int Score(string value)
        {
            // Low/Medium/High -> 1/2/3 (default 1)
            if (string.IsNullOrWhiteSpace(value)) return 1;
            var v = value.Trim().ToLower();
            return v switch
            {
                "low" => 1,
                "medium" => 2,
                "high" => 3,
                _ => 1
            };
        }

        private static bool IsAllowedLevel(string v)
        {
            if (string.IsNullOrWhiteSpace(v)) return false;
            var s = v.Trim().ToLower();
            return s is "low" or "medium" or "high";
        }

        private static bool IsAllowedStatus(string v)
        {
            if (string.IsNullOrWhiteSpace(v)) return false;
            var s = v.Trim().ToLower();
            return s is "open" or "monitoring" or "mitigated" or "occurred" or "closed";
        }

        private async Task<Project?> GetWorkspaceProject(Guid wsId, Guid projectId)
        {
            return await _db.Projects.FirstOrDefaultAsync(p =>
                p.Id == projectId && p.WorkspaceId == wsId
            );
        }

       
        // GET /api/risks?projectId=...
        // Workspace-scoped, returns exposure score
      
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetByProject([FromQuery] Guid projectId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Invalid user.");

            if (!TryGetWorkspaceId(out var wsId))
                return Unauthorized("Workspace not selected.");

            if (!await IsWorkspaceMember(wsId, userId))
                return Forbid("You are not a member of this workspace.");

            var project = await GetWorkspaceProject(wsId, projectId);
            if (project == null)
                return NotFound("Project not found in this workspace.");

            var risks = await _db.ProjectRisks
                .AsNoTracking()
                .Where(r => r.WorkspaceId == wsId && r.ProjectId == projectId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    id = r.Id,
                    projectId = r.ProjectId,
                    title = r.Title,
                    description = r.Description,
                    category = r.Category,
                    probability = r.Probability,
                    impact = r.Impact,
                    exposure = Score(r.Probability) * Score(r.Impact),
                    consequence = r.Consequence,
                    mitigationPlan = r.MitigationPlan,
                    ownerUserId = r.OwnerUserId,
                    status = r.Status,
                    createdAt = r.CreatedAt,
                    closedAt = r.ClosedAt
                })
                .ToListAsync();

            return Ok(risks);
        }

        // POST /api/risks
        // Anyone in workspace can create risk
        // (you can tighten this later if you want)
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] ProjectRiskCreateDto dto)
        {
            if (dto == null) return BadRequest("Invalid payload.");

            if (!TryGetUserId(out var userId))
                return Unauthorized("Invalid user.");

            if (!TryGetWorkspaceId(out var wsId))
                return Unauthorized("Workspace not selected.");

            if (!await IsWorkspaceMember(wsId, userId))
                return Forbid("You are not a member of this workspace.");

            var project = await GetWorkspaceProject(wsId, dto.ProjectId);
            if (project == null)
                return NotFound("Project not found in this workspace.");

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Title is required.");

            if (!IsAllowedLevel(dto.Probability) || !IsAllowedLevel(dto.Impact))
                return BadRequest("Probability and Impact must be one of: Low, Medium, High.");

            // Owner must be in same workspace if provided
            if (dto.OwnerUserId.HasValue)
            {
                var ownerOk = await _db.WorkspaceUsers.AnyAsync(wu =>
                    wu.WorkspaceId == wsId && wu.UserId == dto.OwnerUserId.Value
                );
                if (!ownerOk)
                    return BadRequest("Owner must be a member of this workspace.");
            }

            var risk = new ProjectRisk
            {
                Id = Guid.NewGuid(),
                WorkspaceId = wsId,
                ProjectId = dto.ProjectId,
                Title = dto.Title.Trim(),
                Description = dto.Description,
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "General" : dto.Category.Trim(),
                Probability = dto.Probability.Trim(),
                Impact = dto.Impact.Trim(),
                Consequence = dto.Consequence,
                MitigationPlan = dto.MitigationPlan,
                OwnerUserId = dto.OwnerUserId,
                Status = "Open",
                CreatedAt = DateTime.UtcNow
            };

            _db.ProjectRisks.Add(risk);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                id = risk.Id,
                exposure = Score(risk.Probability) * Score(risk.Impact)
            });
        }

        // PATCH /api/risks/{id}
        // Update details (title/prob/impact/etc)
        // Rule:
        // - Owner can update
        // - PO/SM can update anyone's risk
        [HttpPatch("{id:guid}")]
        [Authorize]
        public async Task<IActionResult> Update(Guid id, [FromBody] ProjectRiskUpdateDto dto)
        {
            if (dto == null) return BadRequest("Invalid payload.");

            if (!TryGetUserId(out var userId))
                return Unauthorized("Invalid user.");

            if (!TryGetWorkspaceId(out var wsId))
                return Unauthorized("Workspace not selected.");

            if (!await IsWorkspaceMember(wsId, userId))
                return Forbid("You are not a member of this workspace.");

            var risk = await _db.ProjectRisks.FirstOrDefaultAsync(r => r.Id == id && r.WorkspaceId == wsId);
            if (risk == null) return NotFound("Risk not found.");

            var role = User.FindFirstValue(ClaimTypes.Role) ?? "Pending";
            var isPoOrSm = role == "ProductOwner" || role == "ScrumMaster";
            var isOwner = risk.OwnerUserId.HasValue && risk.OwnerUserId.Value == userId;

            if (!isPoOrSm && !isOwner)
                return Forbid("Only the risk owner or PO/SM can update this risk.");

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Title is required.");

            if (!IsAllowedLevel(dto.Probability) || !IsAllowedLevel(dto.Impact))
                return BadRequest("Probability and Impact must be one of: Low, Medium, High.");

            if (dto.OwnerUserId.HasValue)
            {
                var ownerOk = await _db.WorkspaceUsers.AnyAsync(wu =>
                    wu.WorkspaceId == wsId && wu.UserId == dto.OwnerUserId.Value
                );
                if (!ownerOk)
                    return BadRequest("Owner must be a member of this workspace.");
            }

            risk.Title = dto.Title.Trim();
            risk.Description = dto.Description;
            risk.Category = string.IsNullOrWhiteSpace(dto.Category) ? "General" : dto.Category.Trim();
            risk.Probability = dto.Probability.Trim();
            risk.Impact = dto.Impact.Trim();
            risk.Consequence = dto.Consequence;
            risk.MitigationPlan = dto.MitigationPlan;
            risk.OwnerUserId = dto.OwnerUserId;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                id = risk.Id,
                exposure = Score(risk.Probability) * Score(risk.Impact)
            });
        }

        // PATCH /api/risks/{id}/status
        // Rule:
        // - PO/SM can change status
        // - Owner can also change status except "Closed" (optional)
        [HttpPatch("{id:guid}/status")]
        [Authorize]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] ProjectRiskStatusDto dto)
        {
            if (dto == null) return BadRequest("Invalid payload.");

            if (!TryGetUserId(out var userId))
                return Unauthorized("Invalid user.");

            if (!TryGetWorkspaceId(out var wsId))
                return Unauthorized("Workspace not selected.");

            if (!await IsWorkspaceMember(wsId, userId))
                return Forbid("You are not a member of this workspace.");

            var risk = await _db.ProjectRisks.FirstOrDefaultAsync(r => r.Id == id && r.WorkspaceId == wsId);
            if (risk == null) return NotFound("Risk not found.");

            if (!IsAllowedStatus(dto.Status))
                return BadRequest("Status must be one of: Open, Monitoring, Mitigated, Occurred, Closed.");

            var role = User.FindFirstValue(ClaimTypes.Role) ?? "Pending";
            var isPoOrSm = role == "ProductOwner" || role == "ScrumMaster";
            var isOwner = risk.OwnerUserId.HasValue && risk.OwnerUserId.Value == userId;

            // Tight rule: only PO/SM can close
            var wantsClose = dto.Status.Trim().Equals("Closed", StringComparison.OrdinalIgnoreCase);

            if (!isPoOrSm && (!isOwner || wantsClose))
                return Forbid("Only PO/SM can close risks. Owner can update other statuses.");

            risk.Status = dto.Status.Trim();

            if (wantsClose)
                risk.ClosedAt = DateTime.UtcNow;
            else
                risk.ClosedAt = null;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                id = risk.Id,
                status = risk.Status,
                closedAt = risk.ClosedAt
            });
        }
    }
}
