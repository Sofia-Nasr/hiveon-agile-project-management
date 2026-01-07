using HiveonBackend.Data;
using HiveonBackend.DTOs;
using HiveonBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Linq;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace HiveonBackend.Controllers
{
    [ApiController]
    [Route("api/workspace")]
    public class WorkspaceController : ControllerBase
    {
        private readonly AppDbContext _db;

        public WorkspaceController(AppDbContext db)
        {
            _db = db;
        }

        // ================= HELPERS =================
        private Guid GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
        }

        private Guid GetWorkspaceId()
        {
            var wsClaim = User.FindFirst("workspaceId")?.Value;
            if (!Guid.TryParse(wsClaim, out var wsId))
                throw new UnauthorizedAccessException("Workspace not selected.");
            return wsId;
        }

        // ============================================
        // CREATE WORKSPACE
        // ============================================
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create(WorkspaceCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Workspace name is required.");

            var userId = GetUserId();
            if (userId == Guid.Empty)
                return Unauthorized();

            var ws = new Workspace
            {
                Id = Guid.NewGuid(),
                Name = dto.Name.Trim(),
                OwnerId = userId
            };

            _db.Workspaces.Add(ws);

            // Creator becomes ProductOwner in THIS workspace
            _db.WorkspaceUsers.Add(new WorkspaceUser
            {
                WorkspaceId = ws.Id,
                UserId = userId,
                Role = "ProductOwner",
                JoinedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return Ok(new { id = ws.Id, name = ws.Name });
        }

        // ============================================
        // GET CURRENT WORKSPACE (from JWT)
        // ============================================
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMyWorkspace()
        {
            var wsId = GetWorkspaceId();

            var ws = await _db.Workspaces
                .Include(w => w.Users)
                .Include(w => w.Projects)
                .FirstOrDefaultAsync(w => w.Id == wsId);

            if (ws == null)
                return NotFound("Workspace not found.");

            return Ok(new WorkspaceSummaryDto
            {
                Id = ws.Id,
                Name = ws.Name,
                MemberCount = ws.Users.Count,
                ProjectCount = ws.Projects.Count
            });
        }

        // ============================================
        // ADD MEMBER TO WORKSPACE (OWNER ONLY)
        // ============================================
        [HttpPost("add-member")]
        [Authorize(Roles = "ProductOwner")]
        public async Task<IActionResult> AddMember(AddWorkspaceMemberDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest("Email required.");

            var userId = GetUserId();
            var wsId = GetWorkspaceId();

            // 🔒 ensure caller owns this workspace
            var ws = await _db.Workspaces
                .FirstOrDefaultAsync(w => w.Id == wsId && w.OwnerId == userId);

            if (ws == null)
                return Forbid("You do not own this workspace.");

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
                return NotFound("User does not exist.");

            var alreadyMember = await _db.WorkspaceUsers
                .AnyAsync(wu => wu.WorkspaceId == wsId && wu.UserId == user.Id);

            if (alreadyMember)
                return BadRequest("User already in workspace.");

            _db.WorkspaceUsers.Add(new WorkspaceUser
            {
                WorkspaceId = wsId,
                UserId = user.Id,
                Role = "Member"

            });

            await _db.SaveChangesAsync();

            return Ok(new { message = "User added to workspace.", userId = user.Id });
        }
        [HttpPost("switch")]
        [Authorize]
        public async Task<IActionResult> SwitchWorkspace([FromBody] WorkspaceSwitchDto dto)
        {
            if (dto == null || dto.WorkspaceId == Guid.Empty)
                return BadRequest("WorkspaceId is required.");

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            // Ensure user belongs to requested workspace
            var membership = await _db.WorkspaceUsers
                .Include(wu => wu.Workspace)
                .FirstOrDefaultAsync(wu =>
                    wu.UserId == userId &&
                    wu.WorkspaceId == dto.WorkspaceId);

            if (membership == null)
                return Forbid("You are not a member of this workspace.");

            var user = await _db.Users
              
                .FirstAsync(u => u.Id == userId);

            var roleName = membership.Role;


            var token = GenerateJwt(user, roleName, dto.WorkspaceId);

            return Ok(new
            {
                token,
                workspace = new
                {
                    id = membership.Workspace.Id,
                    name = membership.Workspace.Name,
                    role = membership.Role
                }
            });
        }

        [HttpPost("join")]
        [Authorize]
        public async Task<IActionResult> JoinByCode([FromBody] JoinWorkspaceDto dto)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
                return Unauthorized();

            var invite = await _db.WorkspaceInvitations
                .Include(i => i.Workspace)
                .FirstOrDefaultAsync(i =>
                    i.JoinCode == dto.Code &&
                    !i.IsAccepted &&
                    i.ExpiresAt > DateTime.UtcNow);

            if (invite == null)
                return BadRequest("Invalid or expired join code.");

            var alreadyMember = await _db.WorkspaceUsers.AnyAsync(wu =>
                wu.WorkspaceId == invite.WorkspaceId &&
                wu.UserId == userId);

            if (!alreadyMember)
            {
                _db.WorkspaceUsers.Add(new WorkspaceUser
                {
                    WorkspaceId = invite.WorkspaceId,
                    UserId = userId,
                    Role = invite.Role
                });
            }

            invite.IsAccepted = true;
            await _db.SaveChangesAsync();

            // 🔑 CREATE NEW JWT WITH WORKSPACE CONTEXT
            var user = await _db.Users.FirstAsync(u => u.Id == userId);
            var token = GenerateJwt(user, invite.Role, invite.WorkspaceId);

            return Ok(new
            {
                token,
                workspace = new
                {
                    id = invite.WorkspaceId,
                    name = invite.Workspace.Name,
                    role = invite.Role
                }
            });
        }



        // ============================================
        // GET WORKSPACE MEMBERS
        // ============================================
        [HttpGet("members")]
        [Authorize]
        public async Task<IActionResult> GetMembers()
        {
            var wsId = GetWorkspaceId();

            var users = await _db.WorkspaceUsers
                .Where(wu => wu.WorkspaceId == wsId)
                .Select(wu => new
                {
                    id = wu.User.Id,
                    name = wu.User.Username,
                    email = wu.User.Email,
                    role = wu.Role

                })
                .ToListAsync();

            return Ok(users);
        }
        private string GenerateJwt(User user, string roleName, Guid workspaceId)
        {
            var jwt = HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()
                .GetSection("Jwt");

            var key = jwt["Key"];

            var signingKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(key));

            var creds = new SigningCredentials(
                signingKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Username),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Role, roleName),
        new Claim("workspaceId", workspaceId.ToString()) // 🔑 THIS WAS MISSING
    };

            var token = new JwtSecurityToken(
                issuer: jwt["Issuer"],
                audience: jwt["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(
                    double.TryParse(jwt["ExpireMinutes"], out var m) ? m : 60),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

    }
}
