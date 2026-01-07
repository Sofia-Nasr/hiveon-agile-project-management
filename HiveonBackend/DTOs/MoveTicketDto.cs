namespace HiveonBackend.DTOs
{
    public class MoveTicketDto
    {
        public Guid TicketId { get; set; }
        public string Status { get; set; } = string.Empty;
        public int Order { get; set; }
    }
}
