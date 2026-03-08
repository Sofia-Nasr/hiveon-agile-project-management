using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
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
    [Route("api/comments")]
    [Authorize]
    public class CommentsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IEmailService _emailService;

        public CommentsController(AppDbContext db, IEmailService emailService)
        {
            _db = db;
            _emailService = emailService;
        }

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

        private async Task<(bool ok, Guid projectId)> ResolveEntityProjectAsync(
            string entityType,
            Guid entityId,
            Guid wsId,
            CancellationToken ct)
        {
            if (entityType == "TaskItem")
            {
                var task = await _db.Tasks
                    .AsNoTracking()
                    .Include(t => t.Project)
                    .FirstOrDefaultAsync(t => t.Id == entityId, ct);

                if (task == null) return (false, Guid.Empty);
                if (task.Project == null || task.Project.WorkspaceId != wsId) return (false, Guid.Empty);
                return (true, task.ProjectId);
            }

            if (entityType == "UserStory")
            {
                var story = await _db.UserStories
                    .AsNoTracking()
                    .Include(s => s.Project)
                    .FirstOrDefaultAsync(s => s.Id == entityId, ct);

                if (story == null) return (false, Guid.Empty);
                if (story.Project == null || story.Project.WorkspaceId != wsId) return (false, Guid.Empty);
                return (true, story.ProjectId);
            }

            if (entityType == "Epic")
            {
                var epic = await _db.Epics
                    .AsNoTracking()
                    .Include(e => e.Project)
                    .FirstOrDefaultAsync(e => e.Id == entityId, ct);

                if (epic == null) return (false, Guid.Empty);
                if (epic.Project == null || epic.Project.WorkspaceId != wsId) return (false, Guid.Empty);
                return (true, epic.ProjectId);
            }

            return (false, Guid.Empty);
        }
        private static IEnumerable<string> ExtractMentionEmails(string content)
        {
            var text = content ?? "";

            // Strict email capture (stops at punctuation)
            var matches = Regex.Matches(
                text,
                @"@[^|\r\n]+\|([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})"
            );

            foreach (Match m in matches)
            {
                yield return m.Groups[1].Value.Trim().ToLowerInvariant();
            }
        }

        private async Task<bool> IsWorkspaceMember(Guid wsId, Guid userId, CancellationToken ct)
        {
            return await _db.WorkspaceUsers
                .AnyAsync(wu => wu.WorkspaceId == wsId && wu.UserId == userId, ct);
        }

        // GET /api/comments?entityType=TaskItem&entityId=...
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string entityType, [FromQuery] Guid entityId, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(entityType)) return BadRequest("entityType is required.");
            if (entityId == Guid.Empty) return BadRequest("entityId is required.");

            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;

            var trimmedType = entityType.Trim();
            var (ok, projectId) = await ResolveEntityProjectAsync(trimmedType, entityId, wsId, ct);
            if (!ok) return Forbid();

            var list = await _db.Comments
                .AsNoTracking()
                .Where(c =>
                    c.WorkspaceId == wsId &&
                    c.ProjectId == projectId &&
                    c.EntityType == trimmedType &&
                    c.EntityId == entityId)
                .OrderBy(c => c.CreatedAt) // oldest -> newest (UI chat style)
                .Select(c => new
                {
                    id = c.Id,
                    content = c.Content,
                    createdAt = c.CreatedAt,
                    authorId = c.AuthorUserId,
                    authorName = c.AuthorUser.Username ?? c.AuthorUser.Email
                })
                .ToListAsync(ct);

            return Ok(list);
        }

        // POST /api/comments
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCommentDto dto, CancellationToken ct)
        {
            if (dto == null) return BadRequest("Body required.");
            if (string.IsNullOrWhiteSpace(dto.EntityType)) return BadRequest("EntityType is required.");
            if (dto.EntityId == Guid.Empty) return BadRequest("EntityId is required.");
            if (string.IsNullOrWhiteSpace(dto.Content)) return BadRequest("Content is required.");

            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;

            var userId = GetUserId();

            // Must be member of workspace
            if (!await IsWorkspaceMember(wsId, userId, ct))
                return Forbid("User is not part of this workspace.");

            var entityType = dto.EntityType.Trim();
            var (ok, projectId) = await ResolveEntityProjectAsync(entityType, dto.EntityId, wsId, ct);
            if (!ok) return Forbid();

            var comment = new Comment
            {
                WorkspaceId = wsId,
                ProjectId = projectId,
                EntityType = entityType,
                EntityId = dto.EntityId,
                AuthorUserId = userId,
                Content = dto.Content.Trim()
            };

            _db.Comments.Add(comment);

            // Extract mentioned emails
            var mentionedEmails = ExtractMentionEmails(comment.Content)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            List<User> mentionedUsers = new();

            if (mentionedEmails.Count > 0)
            {
                mentionedUsers = await _db.WorkspaceUsers
    .Where(wu => wu.WorkspaceId == wsId)
    .Select(wu => wu.User)
    .Where(u =>
        mentionedEmails.Contains((u.Email ?? "").ToLower())
    )
    .ToListAsync(ct);

                foreach (var u in mentionedUsers)
                {
                    if (u.Id == userId) continue;

                    _db.CommentMentions.Add(new CommentMention
                    {
                        CommentId = comment.Id,
                        MentionedUserId = u.Id
                    });

                    _db.Notifications.Add(new Notification
                    {
                        WorkspaceId = wsId,
                        UserId = u.Id,
                        Type = "Mention",
                        EntityType = entityType,
                        EntityId = dto.EntityId,
                        CommentId = comment.Id,
                        Message = "You were mentioned in a comment."
                    });
                }
            }

            await _db.SaveChangesAsync(ct);

            // Send emails AFTER saving (non-blocking logic)
            foreach (var u in mentionedUsers)
            {
                if (string.IsNullOrWhiteSpace(u.Email)) continue;

                try
                {
                    await _emailService.SendMentionEmail(
                        u.Email,
                        comment.Content,
                        entityType,
                        dto.EntityId.ToString()
                    );
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[MentionEmail] Failed for {u.Email}: {ex.Message}");
                }
            }

            return Ok(new
            {
                id = comment.Id,
                createdAt = comment.CreatedAt
            });
        }
        // DELETE /api/comments/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            if (!TryGetWorkspaceId(out var wsId, out var err))
                return err;

            var userId = GetUserId();
            var role = User?.FindFirst(ClaimTypes.Role)?.Value ?? "";

            var comment = await _db.Comments
                .FirstOrDefaultAsync(c => c.Id == id && c.WorkspaceId == wsId, ct);

            if (comment == null) return NotFound();

            var isAuthor = comment.AuthorUserId == userId;
            var isPrivileged = role == "ProductOwner" || role == "ScrumMaster";

            if (!isAuthor && !isPrivileged)
                return Forbid();

            _db.Comments.Remove(comment);
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }
    }
}