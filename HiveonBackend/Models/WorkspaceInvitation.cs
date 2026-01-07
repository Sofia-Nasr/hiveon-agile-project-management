using HiveonBackend.Models;

public class WorkspaceInvitation
{
    public int Id { get; set; }

    public Guid WorkspaceId { get; set; }

    public Workspace Workspace { get; set; }
    public string Email { get; set; }

    public string Role { get; set; } // ProductOwner | ScrumMaster | Developer

    public string Token { get; set; }     // secure
    public string JoinCode { get; set; }  // UX-friendly


    public DateTime ExpiresAt { get; set; }
    public bool IsAccepted { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
