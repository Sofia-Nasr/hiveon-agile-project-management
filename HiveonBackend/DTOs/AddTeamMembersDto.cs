namespace HiveonBackend.DTOs
{
    public class AddTeamMembersDto
    {
        public List<Guid> UserIds { get; set; } = new();
        public string RoleInTeam { get; set; } = "Developer";
    }
}
