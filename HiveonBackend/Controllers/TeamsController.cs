using HiveonBackend.Data;
using HiveonBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace HiveonBackend.Controllers;

// UPDATED: include TeamLeadId
public record CreateTeamDto(Guid ProjectId, string Name, Guid? TeamLeadId);

// UPDATED: RoleInTeam optional (null/empty -> "Member")
public record AddTeamMembersDto(Guid[] UserIds, string? RoleInTeam);

// UPDATED: rename now also updates TeamLeadId
public record RenameTeamDto(string Name, Guid? TeamLeadId);

[ApiController]
[Route("api/teams")]
public class TeamsController : ControllerBase
{
    private readonly AppDbContext _db;
    public TeamsController(AppDbContext db) => _db = db;

    // ================= HELPERS =================
    private Guid GetWorkspaceId()
    {
        var wsClaim = User.FindFirst("workspaceId")?.Value;
        if (!Guid.TryParse(wsClaim, out var wsId))
            throw new UnauthorizedAccessException("Workspace not selected.");
        return wsId;
    }

    private Task<bool> ProjectInWorkspace(Guid projectId, Guid wsId, CancellationToken ct)
    {
        return _db.Projects.AnyAsync(
            p => p.Id == projectId && p.WorkspaceId == wsId,
            ct);
    }

    // POST /api/teams
    [HttpPost]
    [Authorize(Roles = "ProductOwner,ScrumMaster")]
    public async Task<IActionResult> CreateTeam(CreateTeamDto dto, CancellationToken ct)
    {
        if (dto.ProjectId == Guid.Empty)
            return BadRequest("ProjectId is required.");

        var wsId = GetWorkspaceId();

        // 🔒 workspace enforcement
        var projectOk = await ProjectInWorkspace(dto.ProjectId, wsId, ct);
        if (!projectOk) return Forbid();

        var team = new Team
        {
            Id = Guid.NewGuid(),
            ProjectId = dto.ProjectId,
            Name = dto.Name,
            TeamLeadId = dto.TeamLeadId
        };

        _db.Teams.Add(team);
        await _db.SaveChangesAsync(ct);

        return Ok(team);
    }

    // GET /api/teams?projectId=
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetTeams([FromQuery] Guid projectId, CancellationToken ct)
    {
        if (projectId == Guid.Empty)
            return BadRequest("projectId is required.");

        var wsId = GetWorkspaceId();

        // 🔒 workspace enforcement
        var projectOk = await ProjectInWorkspace(projectId, wsId, ct);
        if (!projectOk) return Forbid();

        var teams = await _db.Teams
            .Where(t => t.ProjectId == projectId)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Select(t => new
            {
                id = t.Id,
                name = t.Name,
                teamLeadId = t.TeamLeadId,
                members = t.Members.Select(m => new
                {
                    id = m.UserId,
                    name = m.User.Username,
                    email = m.User.Email
                })
            })
            .ToListAsync(ct);

        return Ok(teams);
    }

    // POST /api/teams/{teamId}/members
    [HttpPost("{teamId:guid}/members")]
    [Authorize(Roles = "ProductOwner,ScrumMaster")]
    public async Task<IActionResult> AddMembers(Guid teamId, AddTeamMembersDto dto, CancellationToken ct)
    {
        var wsId = GetWorkspaceId();

        // 🔒 workspace enforcement via team → project
        var team = await _db.Teams
            .FirstOrDefaultAsync(
                t => t.Id == teamId && t.Project.WorkspaceId == wsId,
                ct);

        if (team == null) return NotFound();

        var role = string.IsNullOrWhiteSpace(dto.RoleInTeam)
            ? "Member"
            : dto.RoleInTeam;

        foreach (var userId in dto.UserIds)
        {
            _db.TeamMembers.Add(new TeamMember
            {
                TeamId = teamId,
                UserId = userId,
                RoleInTeam = role
            });
        }

        await _db.SaveChangesAsync(ct);
        return Ok();
    }

    // PUT /api/teams/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "ProductOwner,ScrumMaster")]
    public async Task<IActionResult> Rename(Guid id, [FromBody] RenameTeamDto dto, CancellationToken ct)
    {
        var wsId = GetWorkspaceId();

        // 🔒 workspace enforcement
        var team = await _db.Teams
            .FirstOrDefaultAsync(
                t => t.Id == id && t.Project.WorkspaceId == wsId,
                ct);

        if (team == null) return NotFound();

        team.Name = dto.Name.Trim();
        team.TeamLeadId = dto.TeamLeadId;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/teams/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "ProductOwner,ScrumMaster")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var wsId = GetWorkspaceId();

        // 🔒 workspace enforcement
        var team = await _db.Teams
            .Include(t => t.Members)
            .FirstOrDefaultAsync(
                t => t.Id == id && t.Project.WorkspaceId == wsId,
                ct);

        if (team == null) return NotFound();

        _db.TeamMembers.RemoveRange(team.Members);
        _db.Teams.Remove(team);

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/teams/{teamId}/members/{userId}
    [HttpDelete("{teamId:guid}/members/{userId:guid}")]
    [Authorize(Roles = "ProductOwner,ScrumMaster")]
    public async Task<IActionResult> RemoveMember(Guid teamId, Guid userId, CancellationToken ct)
    {
        var wsId = GetWorkspaceId();

        // 🔒 workspace enforcement
        var team = await _db.Teams
            .FirstOrDefaultAsync(
                t => t.Id == teamId && t.Project.WorkspaceId == wsId,
                ct);

        if (team == null) return NotFound();

        var tm = await _db.TeamMembers
            .FirstOrDefaultAsync(
                x => x.TeamId == teamId && x.UserId == userId,
                ct);

        if (tm == null) return NotFound();

        _db.TeamMembers.Remove(tm);
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }
}
