namespace HiveonBackend.DTOs
{
    public class AuthResponseDto
    {
        public string Token { get; set; }

        public bool RequiresWorkspace { get; set; }

        public Guid? ActiveWorkspaceId { get; set; }

        public List<WorkspaceSummaryDto> Workspaces { get; set; } = new();
    }
}
