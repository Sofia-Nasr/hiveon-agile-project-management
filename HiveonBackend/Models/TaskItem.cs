using System;

namespace HiveonBackend.Models
{
    public class TaskItem
    {
        public Guid Id { get; set; }

        // Relations
        public Guid ProjectId { get; set; }
        public Project Project { get; set; }

        public Guid? TeamId { get; set; }
        public Team Team { get; set; }

        public Guid? SprintId { get; set; }
        public Sprint Sprint { get; set; }

        public Guid? AssigneeId { get; set; }
        public User Assignee { get; set; }

        // Common fields
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";

        // "Story", "Bug", "Support"
        public string Type { get; set; } = "Story";

        public string Priority { get; set; } = "Medium";
        public string Status { get; set; } = "To Do";

        public int Order { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Story fields
        public int? StoryPoints { get; set; }
        public DateTime? PlannedStart { get; set; }
        public DateTime? PlannedEnd { get; set; }

        // Bug fields
        public bool IsBug => Type == "Bug";

        public IssueSeverity? BugSeverity { get; set; }
        public BugProbability? BugProbability { get; set; }
        public BugEnvironment? ReportedEnvironment { get; set; }

        public bool? BuildCrash { get; set; }
        public bool? ProductionImpacted { get; set; }

        public DateTime? TrendingEndDate { get; set; }

        // FOR DASHBOARD
        public DateTime? CompletedAt { get; set; }
    }
}
