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
    [Route("api/projects")]
    public class ProjectController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ProjectController(AppDbContext db)
        {
            _db = db;
        }

        // ================= HELPERS =================
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

        // ============================================
        // CREATE PROJECT (workspace scoped)
        // ============================================

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] ProjectCreateDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Invalid user.");

            if (!TryGetWorkspaceId(out var wsId))
                return Unauthorized("Workspace not selected.");

            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Project name is required.");

            // Must be a member of the active workspace
            var isMember = await IsWorkspaceMember(wsId, userId);
            if (!isMember)
                return Forbid("You are not a member of this workspace.");

            // Only ProductOwner can create projects
            var wsUser = await _db.WorkspaceUsers.FirstOrDefaultAsync(wu =>
                wu.WorkspaceId == wsId &&
                wu.UserId == userId
            );

            if (wsUser == null)
                return Forbid("You are not a member of this workspace.");

            if (wsUser.Role != "ProductOwner")
                return Forbid("Only Product Owners can create projects.");

            var startDate = dto.StartDate == default
                ? DateTime.UtcNow
                : DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc);

            var endDate = dto.EndDate.HasValue
                ? DateTime.SpecifyKind(dto.EndDate.Value, DateTimeKind.Utc)
                : null as DateTime?;

            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = dto.Name.Trim(),
                Description = dto.Description,
                Client = dto.Client,
                StartDate = startDate,
                EndDate = endDate,
                WorkspaceId = wsId
            };

            _db.Projects.Add(project);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                id = project.Id,
                name = project.Name,
                description = project.Description,
                client = project.Client,
                startDate = project.StartDate,
                endDate = project.EndDate
            });
        }

        // ============================================
        // GET PROJECTS (workspace scoped)
        // ============================================
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll()
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Invalid user.");

            if (!TryGetWorkspaceId(out var wsId))
                return Unauthorized("Workspace not selected.");

            var isMember = await IsWorkspaceMember(wsId, userId);
            if (!isMember)
                return Forbid("You are not a member of this workspace.");

            var projects = await _db.Projects
                .Where(p => p.WorkspaceId == wsId)
                .OrderByDescending(p => p.StartDate)
                .Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    description = p.Description,
                    client = p.Client,
                    startDate = p.StartDate,
                    endDate = p.EndDate
                })
                .ToListAsync();



            return Ok(projects);
        }
        [HttpGet("{projectId:guid}/members")]
        [Authorize]
        public async Task<IActionResult> GetProjectMembers(Guid projectId)
        {
            try
            {
                if (!TryGetUserId(out var userId))
                    return Unauthorized("Invalid user.");

                if (!TryGetWorkspaceId(out var wsId))
                    return Unauthorized("Workspace not selected.");

                var wsUser = await _db.WorkspaceUsers
                    .FirstOrDefaultAsync(wu => wu.WorkspaceId == wsId && wu.UserId == userId);

                if (wsUser == null)
                    return StatusCode(403, "You are not a member of this workspace.");

                var project = await _db.Projects
                    .FirstOrDefaultAsync(p => p.Id == projectId && p.WorkspaceId == wsId);

                if (project == null)
                    return NotFound("Project not found in this workspace.");

                var allowedRoles = new[] { "ScrumMaster", "ProductOwner", "Developer" };
                if (!allowedRoles.Contains(wsUser.Role))
                    return StatusCode(403, "You are not allowed to view meeting participants.");

                var projectMembers = await _db.ProjectMembers
                    .Where(pm => pm.ProjectId == projectId)
                    .Select(pm => new
                    {
                        id = pm.UserId,
                        username = pm.User.Username,
                        email = pm.User.Email,
                        workspaceRole = (string)null
                    })
                    .ToListAsync();

                var scrumMasters = await _db.WorkspaceUsers
                    .Where(wu => wu.WorkspaceId == wsId && wu.Role == "ScrumMaster")
                    .Select(wu => new
                    {
                        id = wu.UserId,
                        username = wu.User.Username,
                        email = wu.User.Email,
                        workspaceRole = wu.Role
                    })
                    .ToListAsync();

                var merged = projectMembers
                    .Concat(scrumMasters)
                    .GroupBy(x => x.id)
                    .Select(g => g.First())
                    .Select(x => new
                    {
                        id = x.id,
                        name = !string.IsNullOrWhiteSpace(x.username) ? x.username : x.email,
                        email = x.email,
                        role = x.workspaceRole
                    })
                    .OrderBy(x => x.name)
                    .ToList();

                return Ok(merged);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}
