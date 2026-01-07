using System.ComponentModel.DataAnnotations;

namespace HiveonBackend.DTOs
{
    public class WorkspaceInviteDto
    {
        [Required]
        public string Email { get; set; }

        [Required]
        public string Role { get; set; } // ProductOwner, Admin, Member, Viewer
    }
}
