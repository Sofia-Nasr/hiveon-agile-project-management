using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HiveonBackend.DTOs
{
    public class ProjectCreateDto : IValidatableObject
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }
        public string? Client { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            // If EndDate is provided, it must be >= StartDate
            if (EndDate.HasValue && EndDate.Value.Date < StartDate.Date)
            {
                yield return new ValidationResult(
                    "EndDate must be the same as or after StartDate.",
                    new[] { nameof(EndDate), nameof(StartDate) }
                );
            }
        }
    }
}
