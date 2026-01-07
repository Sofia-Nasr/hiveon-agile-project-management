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

            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = dto.Name.Trim(),
                Description = dto.Description,
                Client = dto.Client,
                StartDate = dto.StartDate == default ? DateTime.UtcNow : dto.StartDate,
                EndDate = dto.EndDate,
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
    }
}
