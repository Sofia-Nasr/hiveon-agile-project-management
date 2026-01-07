namespace HiveonBackend.DTOs;

public class PmDashboardDto
{
    public HeaderCards Cards { get; set; } = new();
    public List<ActiveTaskDto> ActiveTasks { get; set; } = new();
    public List<SideMenuItemDto> SideMenu { get; set; } = new();

    public class HeaderCards
    {
        public int MyTasks { get; set; }
        public int CompletedToday { get; set; }
        public int CodeReviewsPending { get; set; }   // placeholder for future
        public int BugsAssigned { get; set; }
    }
}

public record ActiveTaskDto(Guid Id, string Title, string? SprintName, string Status, int Percent, string PriorityBadgeText);
public record SideMenuItemDto(string Key, string Label, string Icon, string Path);
