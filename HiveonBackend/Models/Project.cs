using System;
using System.Collections.Generic;

namespace HiveonBackend.Models
{
    public class Project
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Client { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public Guid? CreatedById { get; set; }
        public User? CreatedBy { get; set; }

        //Workspace assignment
        public Guid WorkspaceId { get; set; }
        public Workspace Workspace { get; set; }

        public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
        public ICollection<Sprint> Sprints { get; set; } = new List<Sprint>();
        public ICollection<Epic> Epics { get; set; } = new List<Epic>();
        public ICollection<Team> Teams { get; set; } = new List<Team>();
        public ICollection<ProjectRisk> Risks { get; set; } = new List<ProjectRisk>();

        public ICollection<UserStory> UserStories { get; set; } = new List<UserStory>();
    }
}
