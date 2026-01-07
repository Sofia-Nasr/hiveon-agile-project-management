using HiveonBackend.Data;
using HiveonBackend.DTOs;
using HiveonBackend.Models;
using Microsoft.EntityFrameworkCore;
using IssueSeverityEnum = HiveonBackend.Models.IssueSeverity;

namespace HiveonBackend.Services;

public interface IPmDashboardService
{
    Task<PmDashboardDto> GetAsync(Guid currentUserId, Guid projectId, CancellationToken ct);
}

public class PmDashboardService : IPmDashboardService
{
    private readonly AppDbContext _db;
    public PmDashboardService(AppDbContext db) => _db = db;

    public async Task<PmDashboardDto> GetAsync(Guid userId, Guid projectId, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;

        var myTasks = await _db.Tasks
            .CountAsync(t => t.ProjectId == projectId && t.AssigneeId == userId, ct);

        var completedToday = await _db.Tasks
            .CountAsync(t => t.ProjectId == projectId &&
                             t.CompletedAt != null &&
                             t.CompletedAt >= today, ct);

        var bugsAssigned = await _db.Tasks
            .CountAsync(t => t.ProjectId == projectId && t.IsBug && t.AssigneeId == userId, ct);

        var activeSprint = await _db.Sprints
     .Where(s => s.ProjectId == projectId && s.Status == "Active")
     .OrderByDescending(s => s.StartDate)
     .FirstOrDefaultAsync(ct);


        var activeTasks = await _db.Tasks
            .Where(t => t.ProjectId == projectId &&
                        (t.Status == "In Progress" || t.Status == "To Do"))
            .Select(t => new ActiveTaskDto(
                t.Id,
                t.Title,
                activeSprint != null && t.SprintId == activeSprint.Id ? activeSprint.Name : null,
                t.Status,                             // string already
                t.Status == "In Progress" ? 65 : 30,  // fake progress bar
                t.IsBug && t.BugSeverity == IssueSeverityEnum.High ? "High Priority" : ""
            ))
            .Take(10)
            .ToListAsync(ct);

        return new PmDashboardDto
        {
            Cards = new()
            {
                MyTasks = myTasks,
                CompletedToday = completedToday,
                CodeReviewsPending = 0,
                BugsAssigned = bugsAssigned
            },
            ActiveTasks = activeTasks,
            SideMenu = new()
            {
                new("dashboard","Dashboard","home","/pm/dashboard"),
                new("createProject","Create Project","folder-plus","/projects/new"),
                new("sprints","Sprints","flag","/sprints"),
                new("tasks","Tasks","check-square","/tasks"),
                new("team","Team","users","/team"),
                new("settings","Settings","/settings","/settings")
            }
        };
    }
}
