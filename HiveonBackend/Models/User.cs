using System;
using System.Collections.Generic;

namespace HiveonBackend.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;

        //public int? RoleId { get; set; }
        // public Role? Role { get; set; }

        //  Workspace assignment
        public Guid WorkspaceId { get; set; }
        public ICollection<WorkspaceUser> Workspaces { get; set; }


        public ICollection<ProjectMember> ProjectMemberships { get; set; } = new List<ProjectMember>();
       

        public string? Name { get; internal set; }

        public string? GoogleAccessToken { get; set; }
        public string? GoogleRefreshToken { get; set; }
        public DateTime? GoogleTokenExpiry { get; set; }

    }
}
