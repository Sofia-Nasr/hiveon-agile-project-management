namespace HiveonBackend.DTOs
{
    public class WorkspaceSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public int MemberCount { get; set; }
        public int ProjectCount { get; set; }
    }
}
