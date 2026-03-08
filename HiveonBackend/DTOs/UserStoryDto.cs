using System;

namespace HiveonBackend.DTOs
{
    public class UserStoryDto
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public Guid? EpicId { get; set; }
        public Guid? SprintId { get; set; }
      
        public string? TargetForSprint { get; set; }
        public string? AcceptanceCriteria { get; set; }
        public Guid? AssigneeId { get; set; }

      
        public string? AssigneeName { get; set; }

       
 
        public string? SprintName { get; set; }

    
        public string? EpicName { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? AssigneeEmail { get; set; }

        public int StoryPoints { get; set; }
        public int Order { get; set; }
        public string Priority { get; set; } = "Medium";
        public string Status { get; set; } = "To Do";
        public DateTime CreatedAt { get; set; }
    }
}
