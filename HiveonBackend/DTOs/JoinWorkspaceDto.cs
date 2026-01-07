using System.ComponentModel.DataAnnotations;

namespace HiveonBackend.DTOs
{
    public class JoinWorkspaceDto
    {
        [Required]
        public string Code { get; set; }
    }
}
