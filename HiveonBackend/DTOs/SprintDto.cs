using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HiveonBackend.DTOs
{
    // ================= CREATE =================
    // Enforces EndDate >= StartDate (same pattern as ProjectCreateDto)
    public class CreateSprintDto : IValidatableObject
    {
        public Guid ProjectId { get; set; }
        public Guid TeamId { get; set; }

        public string Name { get; set; } = string.Empty;

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
       
        public string? Goal { get; set; }



        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (EndDate.Date < StartDate.Date)
            {
                yield return new ValidationResult(
                    "EndDate must be the same as or after StartDate.",
                    new[] { nameof(EndDate), nameof(StartDate) }
                );
            }
        }
    }

    // ================= READ =================
    public class SprintDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public string? Goal { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        // Planned | Active | Completed
        public string Status { get; set; } = "Planned";

        public Guid TeamId { get; set; }
    }

    // ================= EXTEND =================
    public class UpdateSprintDatesDto
    {
        public DateTime EndDate { get; set; }
    }

    // ================= STORY ASSIGNMENT =================
    public class SprintStoryIdsDto
    {
        public List<Guid> StoryIds { get; set; } = new();
    }

    // ================= REORDER =================
    public class SprintReorderDto
    {
        public List<Guid> StoryIds { get; set; } = new();
    }
}
