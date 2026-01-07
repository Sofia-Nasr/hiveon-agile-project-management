using System;
using System.Collections.Generic;

namespace HiveonBackend.Models
{
    public class Workspace
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;

        // Owner (PO who created the workspace)
        public Guid OwnerId { get; set; }
        public User Owner { get; set; }

        public ICollection<WorkspaceUser> Users { get; set; }
        public ICollection<WorkspaceInvitation> Invitations { get; set; }

        // Projects in the workspace
        public ICollection<Project> Projects { get; set; } = new List<Project>();

        

    }
}
