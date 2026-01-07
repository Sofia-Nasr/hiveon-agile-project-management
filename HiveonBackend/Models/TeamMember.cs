using System;

namespace HiveonBackend.Models
{
    public class TeamMember
    {
        public Guid TeamId { get; set; }
        public Team Team { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; }

        public string? RoleInTeam { get; set; }
    }
}
