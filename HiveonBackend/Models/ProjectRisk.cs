using System;

namespace HiveonBackend.Models
{
    public class ProjectRisk
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid WorkspaceId { get; set; }   // workspace enforcement
        public Guid ProjectId { get; set; }
        public Project Project { get; set; } = null!;

        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        // Examples: Technical, Business, Dependency, Infrastructure, Resource
        public string Category { get; set; } = "General";

        // Low / Medium / High
        public string Probability { get; set; } = "Low";
        public string Impact { get; set; } = "Low";

        // consequence like "may delay project by 2 weeks"
        public string? Consequence { get; set; }

        public string? MitigationPlan { get; set; }

        // Owner of mitigation / monitoring
        public Guid? OwnerUserId { get; set; }
        public User? OwnerUser { get; set; }

        // Open / Monitoring / Mitigated / Occurred / Closed
        public string Status { get; set; } = "Open";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ClosedAt { get; set; }
    }
}
