using System;
using System.Collections.Generic;

namespace HiveonBackend.Models
{
    public class Sprint
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        // Relations
        public Guid ProjectId { get; set; }
        public Project Project { get; set; } = default!;

        public Guid TeamId { get; set; }
        public Team Team { get; set; } = default!;

        // Core fields
        public string Name { get; set; } = string.Empty;
        public string? Goal { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        // Jira-style lifecycle
        // Planned | Active | Completed
        public string Status { get; set; } = "Planned";

        // Audit
        public Guid CreatedById { get; set; }
        public User CreatedBy { get; set; } = default!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Backlog
        public ICollection<UserStory> Stories { get; set; } = new List<UserStory>();
    }
}
