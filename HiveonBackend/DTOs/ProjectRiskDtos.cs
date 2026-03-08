using System;
using System.ComponentModel.DataAnnotations;

namespace HiveonBackend.DTOs
{
    public class ProjectRiskCreateDto
    {
        [Required]
        public Guid ProjectId { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public string Category { get; set; } = "General"; // Technical/Business/etc

        [Required]
        public string Probability { get; set; } = "Low";  // Low/Medium/High

        [Required]
        public string Impact { get; set; } = "Low";       // Low/Medium/High

        public string? Consequence { get; set; }          // e.g. "2 week delay"
        public string? MitigationPlan { get; set; }

        public Guid? OwnerUserId { get; set; }
    }

    public class ProjectRiskUpdateDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }
        public string Category { get; set; } = "General";

        [Required]
        public string Probability { get; set; } = "Low";

        [Required]
        public string Impact { get; set; } = "Low";

        public string? Consequence { get; set; }
        public string? MitigationPlan { get; set; }

        public Guid? OwnerUserId { get; set; }
    }

    public class ProjectRiskStatusDto
    {
        [Required]
        public string Status { get; set; } = "Open"; // Open/Monitoring/Mitigated/Occurred/Closed
    }
}
