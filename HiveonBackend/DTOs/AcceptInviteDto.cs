using System.ComponentModel.DataAnnotations;

namespace HiveonBackend.DTOs
{
    public class AcceptInviteDto
    {
        [Required]
        public string Token { get; set; }
    }
}
