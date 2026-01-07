
using System;
using System.Collections.Generic;
using HiveonBackend.Models;

public class Team
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; }

    public string Name { get; set; } = "";

    public Guid? TeamLeadId { get; set; }
    public User? TeamLead { get; set; }

    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
}
