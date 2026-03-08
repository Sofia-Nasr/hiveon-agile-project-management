using System;

namespace HiveonBackend.Models
{
    public class CommentMention
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid CommentId { get; set; }
        public Comment Comment { get; set; } = default!;

        public Guid MentionedUserId { get; set; }
        public User MentionedUser { get; set; } = default!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
