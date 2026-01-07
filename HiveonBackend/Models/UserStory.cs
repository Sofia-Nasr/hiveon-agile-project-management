using HiveonBackend.Models;
using System.Text.Json.Serialization;

public class UserStory
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }

    [JsonIgnore] public Project Project { get; set; } = default!;
    public string? TargetForSprint { get; set; }

    public Guid? EpicId { get; set; }
    [JsonIgnore] public Epic? Epic { get; set; }


    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    // NEW
    public string? AcceptanceCriteria { get; set; }
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }

    public int Order { get; set; } = 0;
    public string Priority { get; set; } = "Low";  // per note: default Low
    public int StoryPoints { get; set; } = 0;
    public string Status { get; set; } = "To Do";

    public Guid? AssigneeId { get; set; }
    public User? Assignee { get; set; }

    public Guid? SprintId { get; set; }
    [JsonIgnore] public Sprint? Sprint { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
