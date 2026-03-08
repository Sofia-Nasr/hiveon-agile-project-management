using System;

namespace HiveonBackend.DTOs
{
    public class CreateCommentDto
    {
        public string EntityType { get; set; } = string.Empty; // TaskItem/UserStory/Epic
        public Guid EntityId { get; set; }
        public string Content { get; set; } = string.Empty;
    }
}
