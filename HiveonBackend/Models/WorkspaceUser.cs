using System;

namespace HiveonBackend.Models
{
    public class WorkspaceUser
    {
        public Guid WorkspaceId { get; set; }
        public Workspace Workspace { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; }



        public string Role { get; set; } // ProductOwner, Admin, Member, Viewer

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
