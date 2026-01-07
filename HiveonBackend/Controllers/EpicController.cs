using System.Security.Claims;
using HiveonBackend.Data;
using HiveonBackend.DTOs;
using HiveonBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HiveonBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EpicController : ControllerBase
{
    private readonly AppDbContext _db;
    public EpicController(AppDbContext db) => _db = db;

    // ================= HELPERS =================
    private Guid GetWorkspaceId()
    {
        var wsClaim = User.FindFirst("workspaceId")?.Value;
        if (!Guid.TryParse(wsClaim, out var wsId))
            throw new UnauthorizedAccessException("Workspace not selected.");
        return wsId;
    }

    private async Task<Project?> GetProject(Guid projectId, Guid wsId, CancellationToken ct)
    {
        return await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && p.WorkspaceId == wsId, ct);
    }

    // ================= GET ALL =================
    // GET: api/epic?projectId={guid}
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll([FromQuery] Guid? projectId, CancellationToken ct)
    {
        var wsId = GetWorkspaceId();

        var q = _db.Epics
            .AsNoTracking()
            .Include(e => e.UserStories)
            .Where(e => e.Project.WorkspaceId == wsId)
            .AsQueryable();

        if (projectId.HasValue)
            q = q.Where(e => e.ProjectId == projectId.Value);

        var list = await q
            .OrderBy(e => e.Status)
            .ThenBy(e => e.Order)
            .ThenBy(e => e.CreatedAt)
            .Select(e => new EpicDetailDto
            {
                Id = e.Id,
                ProjectId = e.ProjectId,
                Title = e.Title,
                Description = e.Description,
                CreatedAt = e.CreatedAt,
                DueDate = e.DueDate,
                Status = e.Status,
                Priority = e.Priority,
                Order = e.Order,
                UserStories = e.UserStories.Select(s => new UserStoryDto
                {
                    Id = s.Id,
                    ProjectId = s.ProjectId,
                    EpicId = s.EpicId,
                    Title = s.Title,
                    Description = s.Description,
                    StoryPoints = s.StoryPoints,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt
                }).ToList()
            })
            .ToListAsync(ct);

        return Ok(list);
    }

    // ================= GET ONE =================
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var wsId = GetWorkspaceId();

        var e = await _db.Epics
            .Include(x => x.UserStories)
            .FirstOrDefaultAsync(
                x => x.Id == id && x.Project.WorkspaceId == wsId,
                ct);

        if (e is null) return NotFound();

        return Ok(new EpicDetailDto
        {
            Id = e.Id,
            ProjectId = e.ProjectId,
            Title = e.Title,
            Description = e.Description,
            CreatedAt = e.CreatedAt,
            DueDate = e.DueDate,
            Status = e.Status,
            Priority = e.Priority,
            Order = e.Order,
            UserStories = e.UserStories.Select(s => new UserStoryDto
            {
                Id = s.Id,
                ProjectId = s.ProjectId,
                EpicId = s.EpicId,
                Title = s.Title,
                Description = s.Description,
                StoryPoints = s.StoryPoints,
                Status = s.Status,
                CreatedAt = s.CreatedAt
            }).ToList()
        });
    }

    // ================= CREATE =================
    [HttpPost]
    [Authorize(Roles = "ProductOwner,ScrumMaster")]
    public async Task<IActionResult> Create([FromBody] EpicCreateDto dto, CancellationToken ct)
    {
        if (dto is null) return BadRequest("Body required.");
        if (dto.ProjectId == Guid.Empty) return BadRequest("ProjectId is required.");
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        var wsId = GetWorkspaceId();
        var project = await GetProject(dto.ProjectId, wsId, ct);
        if (project == null) return Forbid();

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? createdBy = Guid.TryParse(userIdClaim, out var uid) ? uid : null;

        var nextOrder = await _db.Epics
            .Where(e => e.ProjectId == dto.ProjectId && e.Status == (dto.Status ?? "To Do"))
            .Select(e => (int?)e.Order)
            .MaxAsync(ct) ?? -1;

        var epic = new Epic
        {
            ProjectId = dto.ProjectId,
            Title = dto.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            DueDate = dto.DueDate,
            CreatedById = createdBy,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "To Do" : dto.Status,
            Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority,
            Order = nextOrder + 1
        };

        _db.Epics.Add(epic);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = epic.Id }, epic);
    }

    // ================= PATCH STATUS =================
    public record EpicStatusDto(string Status, int? Order);

    [HttpPatch("{id:guid}/status")]
    [Authorize]
    public async Task<IActionResult> PatchStatus(Guid id, EpicStatusDto body, CancellationToken ct)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.Status))
            return BadRequest("Status required.");

        var wsId = GetWorkspaceId();

        var epic = await _db.Epics
            .FirstOrDefaultAsync(
                x => x.Id == id && x.Project.WorkspaceId == wsId,
                ct);

        if (epic == null) return NotFound();

        if (body.Order == null)
        {
            var next = await _db.Epics
                .Where(e => e.ProjectId == epic.ProjectId && e.Status == body.Status)
                .Select(e => (int?)e.Order)
                .MaxAsync(ct) ?? -1;

            epic.Order = next + 1;
        }
        else
        {
            epic.Order = body.Order.Value;
        }

        epic.Status = body.Status;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ================= REORDER =================
    public record EpicReorderDto(Guid ProjectId, string Column, Guid[] EpicIds);

    [HttpPatch("reorder")]
    [Authorize]
    public async Task<IActionResult> Reorder(EpicReorderDto dto, CancellationToken ct)
    {
        if (dto is null || dto.ProjectId == Guid.Empty)
            return BadRequest("Invalid payload.");

        var wsId = GetWorkspaceId();
        var project = await GetProject(dto.ProjectId, wsId, ct);
        if (project == null) return Forbid();

        var epics = await _db.Epics
            .Where(e => e.ProjectId == dto.ProjectId && dto.EpicIds.Contains(e.Id))
            .ToListAsync(ct);

        for (int i = 0; i < dto.EpicIds.Length; i++)
        {
            var e = epics.First(x => x.Id == dto.EpicIds[i]);
            e.Status = dto.Column;
            e.Order = i;
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
