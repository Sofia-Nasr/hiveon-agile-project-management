using System;
using System.Collections.Generic;

namespace HiveonBackend.DTOs
{
    public class EpicCreateDto
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime? DueDate { get; set; }

       
        public string Status { get; set; } = "To Do";      // Backlog state
        public string Priority { get; set; } = "Medium";   // High, Medium, Low
        public int Order { get; set; } = 0;                // Ordering among Epics
    }

    public class EpicUpdateDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime? DueDate { get; set; }

       
        public string? Status { get; set; }
        public string? Priority { get; set; }
        public int? Order { get; set; }    // allow reordering epics later
    }

    public class EpicDetailDto
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? DueDate { get; set; }


       
        public string? AssigneeName { get; set; }
        public string? AssigneeAvatarUrl { get; set; }
        public string Status { get; set; } = "To Do";
        public string Priority { get; set; } = "Medium";
        public int Order { get; set; } = 0;

        public List<UserStoryDto> UserStories { get; set; } = new();
    }
}
