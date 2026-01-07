using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HiveonBackend.Dtos
{
    public class CreateTicketRequest : IValidatableObject
    {
        public Guid ProjectId { get; set; }

        // Common fields
        public string Type { get; set; } = "";
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public string? Priority { get; set; }

        // NEW (Team support)
        public Guid? TeamId { get; set; }

        // Story / Support / Bug fields
        public Guid? EpicId { get; set; }
        public Guid? AssigneeId { get; set; }
        public Guid? SprintId { get; set; }

        public int? StoryPoints { get; set; }
        public DateTime? PlannedStart { get; set; }
        public DateTime? PlannedEnd { get; set; }
        public string? AcceptanceCriteria { get; set; }

        // Bug fields
        public string? Severity { get; set; }
        public string? Probability { get; set; }
        public string? Environment { get; set; }

        public bool? BuildCrash { get; set; }
        public bool? ProductionImpacted { get; set; }
        public DateTime? TrendingEndDate { get; set; }

        // Epic fields
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? EffortEstimate { get; set; }
        public decimal? RevenueImpact { get; set; }

        public Guid? ProductOwnerId { get; set; }

        // ================= VALIDATION =================
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            // Planned dates
            if (PlannedStart.HasValue && PlannedEnd.HasValue &&
                PlannedEnd.Value.Date < PlannedStart.Value.Date)
            {
                yield return new ValidationResult(
                    "Planned end date cannot be before planned start date.",
                    new[] { nameof(PlannedEnd), nameof(PlannedStart) }
                );
            }

            // Epic-style dates
            if (StartDate.HasValue && EndDate.HasValue &&
                EndDate.Value.Date < StartDate.Value.Date)
            {
                yield return new ValidationResult(
                    "End date cannot be before start date.",
                    new[] { nameof(EndDate), nameof(StartDate) }
                );
            }
        }
    }
}
