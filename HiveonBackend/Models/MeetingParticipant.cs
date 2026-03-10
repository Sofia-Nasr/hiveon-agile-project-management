using System.Diagnostics.Eventing.Reader;

namespace HiveonBackend.Models
{
    public class MeetingParticipant
    {
        public Guid Id { get; set; }

        public Guid MeetingId { get; set; }

        public Guid UserId { get; set; }


        public bool HasJoined { get; set; }

        public Meeting Meeting { get; set; }
    }
}
