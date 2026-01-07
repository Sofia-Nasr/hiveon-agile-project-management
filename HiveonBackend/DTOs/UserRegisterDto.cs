namespace HiveonBackend.DTOs
{
    public class UserRegisterDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public int RoleId { get; set; }          // 1=PM, 2=TeamLead, 3=Developer
    }
}
