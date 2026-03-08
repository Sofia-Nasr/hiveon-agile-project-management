namespace HiveonBackend.DTOs
{
    public class CreateMeetingDto
    {
        
            public Guid ProjectId { get; set; }
            public string Title { get; set; }
            public string Description { get; set; }

            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }

            public List<Guid> ParticipantIds { get; set; }
        
    }
}
