using HiveonBackend.Data;
using HiveonBackend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace HiveonBackend.Controllers;

[ApiController]
[Route("api/board")]
[Authorize]
public class BoardController : ControllerBase
{
    private readonly AppDbContext _db;
    public BoardController(AppDbContext db) => _db = db;

    // ================= HELPERS =================
    private Guid GetWorkspaceId()
    {
        var wsClaim = User.FindFirst("workspaceId")?.Value;
        if (!Guid.TryParse(wsClaim, out var wsId))
            throw new UnauthorizedAccessException("Workspace not selected.");
        return wsId;
    }

    // =====================================================
    // GET /api/board?projectId=&teamId=&sprintId=
    // =====================================================
    [HttpGet]
    public async Task<IActionResult> GetBoard(
        Guid projectId,
        Guid teamId,
        Guid? sprintId)
    {
        if (projectId == Guid.Empty || teamId == Guid.Empty)
            return BadRequest("projectId and teamId are required.");

        var wsId = GetWorkspaceId();

        // 🔒 workspace enforcement via team → project → workspace
        var teamValid = await _db.Teams
            .AnyAsync(t =>
                t.Id == teamId &&
                t.ProjectId == projectId &&
                t.Project.WorkspaceId == wsId);

        if (!teamValid)
            return Forbid();

        // ================= USER STORIES =================
        var stories = await _db.UserStories
    .Where(s =>
        s.ProjectId == projectId &&
        s.TeamId == teamId
    )
    .Select(s => new
    {
        s.Id,
        s.Title,
        s.Description,
        s.Status,
        s.Order,
        Type = "UserStory",
        s.Priority,
        s.AssigneeId
    })
    .ToListAsync();


        // ================= TASKS (BUG + SUPPORT) =================
        var tasksQuery = _db.Tasks
            .Where(t =>
                t.ProjectId == projectId &&
                t.TeamId == teamId
            );

        if (sprintId.HasValue)
            tasksQuery = tasksQuery.Where(t => t.SprintId == sprintId);

        var tasks = await tasksQuery
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.Description,
                t.Status,
                t.Order,
                t.Type, // "Bug" | "Support"
                t.Priority,
                t.AssigneeId
            })
            .ToListAsync();

        // ================= MERGE =================
        var items = stories
            .Concat(tasks)
            .OrderBy(i => i.Status)
            .ThenBy(i => i.Order)
            .ToList();

        return Ok(items);
    }


    // =====================================================
    // PATCH /api/board/move
    // =====================================================
    [HttpPatch("move")]
    public async Task<IActionResult> MoveTicket([FromBody] MoveTicketDto dto)
    {
        if (dto == null)
            return BadRequest("Payload required.");

        var wsId = GetWorkspaceId();

        // 🔒 load ticket WITH workspace check
        var item = await _db.Tasks
            .FirstOrDefaultAsync(t =>
                t.Id == dto.TicketId &&
                t.Project.WorkspaceId == wsId);

        if (item == null)
            return NotFound();

        var oldStatus = item.Status;
        var newStatus = dto.Status;
        var newOrder = dto.Order;

        item.Status = newStatus;

        // ----- OLD COLUMN CLEANUP -----
        var oldColumnTasks = await _db.Tasks
            .Where(t =>
                t.ProjectId == item.ProjectId &&
                t.TeamId == item.TeamId &&
                t.Status == oldStatus &&
                t.Id != item.Id)
            .OrderBy(t => t.Order)
            .ToListAsync();

        for (int i = 0; i < oldColumnTasks.Count; i++)
            oldColumnTasks[i].Order = i;

        // ----- NEW COLUMN INSERT -----
        var newColumnTasks = await _db.Tasks
            .Where(t =>
                t.ProjectId == item.ProjectId &&
                t.TeamId == item.TeamId &&
                t.Status == newStatus &&
                t.Id != item.Id)
            .OrderBy(t => t.Order)
            .ToListAsync();

        // guard against invalid index
        if (newOrder < 0 || newOrder > newColumnTasks.Count)
            newOrder = newColumnTasks.Count;

        newColumnTasks.Insert(newOrder, item);

        for (int i = 0; i < newColumnTasks.Count; i++)
            newColumnTasks[i].Order = i;

        await _db.SaveChangesAsync();
        return Ok();
    }
}
