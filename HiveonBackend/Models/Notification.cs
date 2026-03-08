using System;

namespace HiveonBackend.Models
{
    public class Notification
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid WorkspaceId { get; set; }

        // recipient
        public Guid UserId { get; set; }
        public User User { get; set; } = default!;

        // "Mention" | "Assignment"
        public string Type { get; set; } = string.Empty;

        // "TaskItem" | "UserStory" | "Epic"
        public string EntityType { get; set; } = string.Empty;
        public Guid EntityId { get; set; }

        public Guid? CommentId { get; set; }

        public string Message { get; set; } = string.Empty;

        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
