
using HiveonBackend.Models;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public class Epic
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }

    [JsonIgnore] public Project Project { get; set; } = default!;

    [Required, MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    // NEW (from notes)
    public DateTime? StartDate { get; set; }     // planning
    public DateTime? EndDate { get; set; }       // planning
    public int? EffortEstimate { get; set; }     // story-point-ish for epics (optional)
    public decimal? RevenueImpact { get; set; }  // optional business field
    public string? Client { get; set; }          // optional
    public Guid? ProductOwnerId { get; set; }    // optional owner
    public Guid? AssigneeId { get; set; }        // optional coordinator
    public User? ProductOwner { get; set; }
    public User? Assignee { get; set; }

    public Guid? CreatedById { get; set; }
    public User? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }

    public string Status { get; set; } = "To Do";
    public string Priority { get; set; } = "Medium";
    public int Order { get; set; } = 0;

    [JsonIgnore] public ICollection<UserStory> UserStories { get; set; } = new List<UserStory>();
}
