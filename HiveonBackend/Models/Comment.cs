using System;

namespace HiveonBackend.Models
{
    public class Comment
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid WorkspaceId { get; set; }
        public Guid ProjectId { get; set; }

        // "TaskItem", "UserStory", "Epic" (later: "ProjectRisk")
        public string EntityType { get; set; } = string.Empty;
        public Guid EntityId { get; set; }

        public Guid AuthorUserId { get; set; }
        public User AuthorUser { get; set; } = default!;

        public string Content { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
