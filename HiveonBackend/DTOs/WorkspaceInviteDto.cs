using System.ComponentModel.DataAnnotations;

namespace HiveonBackend.DTOs
{
    public class WorkspaceInviteDto
    {
        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = string.Empty; // ProductOwner, Admin, Member, Viewer
    }
}
