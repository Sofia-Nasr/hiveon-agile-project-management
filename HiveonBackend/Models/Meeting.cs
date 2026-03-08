using System;

namespace HiveonBackend.Models
{
    public class Meeting
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string GoogleMeetLink { get; set; }
        public Guid WorkspaceId { get; set; }
        public Guid ProjectId { get; set; }

        public string Title { get; set; } = "";
        public string? Description { get; set; }

        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        public string MeetingLink { get; set; } = "";

        public Guid CreatedById { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsCancelled { get; set; }
        public List<MeetingParticipant> Participants { get; set; } = new();    }

}