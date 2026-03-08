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
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public NotificationsController(AppDbContext db) => _db = db;

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

        // GET /api/notifications
        [HttpGet]
        public async Task<IActionResult> Get(CancellationToken ct)
        {
            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;

            var userId = GetUserId();

            var list = await _db.Notifications
                .AsNoTracking()
                .Where(n => n.WorkspaceId == wsId && n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
                .Select(n => new
                {
                    id = n.Id,
                    type = n.Type,
                    entityType = n.EntityType,
                    entityId = n.EntityId,
                    commentId = n.CommentId,
                    message = n.Message,
                    isRead = n.IsRead,
                    createdAt = n.CreatedAt
                })
                .ToListAsync(ct);

            return Ok(list);
        }

        // PUT /api/notifications/{id}/read
        [HttpPut("{id:guid}/read")]
        public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
        {
            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;

            var userId = GetUserId();

            var n = await _db.Notifications
                .FirstOrDefaultAsync(x => x.Id == id && x.WorkspaceId == wsId && x.UserId == userId, ct);

            if (n == null) return NotFound();

            n.IsRead = true;
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }
    }
}
