
using System;

namespace HiveonBackend.DTOs
{
    public class CreateTeamDto
    {
        public Guid ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;

        public Guid? TeamLeadId { get; set; }
    }
}
