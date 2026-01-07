using System;
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
    [ApiController]
    [Route("api/users")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;
        public UsersController(AppDbContext db) => _db = db;

        // ================= HELPERS =================
        private Guid GetWorkspaceId()
        {
            var wsClaim = User.FindFirst("workspaceId")?.Value;
            if (!Guid.TryParse(wsClaim, out var wsId))
                throw new UnauthorizedAccessException("Workspace not selected.");
            return wsId;
        }

        // GET: /api/users/search?q=ali
        [HttpGet("search")]
        [Authorize]
        public async Task<IActionResult> Search([FromQuery] string q, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(q))
                return Ok(Array.Empty<object>());

            var wsId = GetWorkspaceId();
            var term = q.Trim().ToLower();

            var users = await _db.WorkspaceUsers
                .AsNoTracking()
                .Where(wu => wu.WorkspaceId == wsId)
                .Select(wu => wu.User)
                .Where(u =>
                    u.Email.ToLower().Contains(term) ||
                    (u.Username != null && u.Username.ToLower().Contains(term)))
                .OrderBy(u => u.Username)
                .Take(20)
                .Select(u => new
                {
                    id = u.Id,
                    name = string.IsNullOrWhiteSpace(u.Username) ? u.Email : u.Username,
                    email = u.Email
                })
                .ToListAsync(ct);

            return Ok(users);
        }
    }
}
