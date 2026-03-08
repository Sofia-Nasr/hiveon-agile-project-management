using HiveonBackend.Models;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;

namespace HiveonBackend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectMember> ProjectMembers { get; set; }
    public DbSet<Sprint> Sprints { get; set; }
    public DbSet<TaskItem> Tasks { get; set; }
    public DbSet<Epic> Epics { get; set; }
    public DbSet<UserStory> UserStories { get; set; }
    public DbSet<Team> Teams { get; set; }

    public DbSet<TeamMember> TeamMembers { get; set; }
    public DbSet<ProjectRisk> ProjectRisks { get; set; }
    public DbSet<Comment> Comments { get; set; }
    public DbSet<CommentMention> CommentMentions { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<GoogleConnection> GoogleConnections { get; set; }
    public DbSet<Meeting> Meetings { get; set; }
    public DbSet<Workspace> Workspaces { get; set; }
    public DbSet<WorkspaceUser> WorkspaceUsers { get; set; }
    public DbSet<WorkspaceInvitation> WorkspaceInvitations { get; set; }
    public DbSet<MeetingParticipant> MeetingParticipants { get; set; }

    protected override void OnModelCreating(ModelBuilder b)
    {


        base.OnModelCreating(b);
        b.Entity<User>().ToTable("Users");

        // WorkspaceUser (JOIN TABLE)
        b.Entity<WorkspaceUser>()
            .HasKey(wu => new { wu.WorkspaceId, wu.UserId });

        b.Entity<WorkspaceUser>()
            .HasOne(wu => wu.Workspace)
            .WithMany(w => w.Users)
            .HasForeignKey(wu => wu.WorkspaceId);

        b.Entity<WorkspaceUser>()
            .HasOne(wu => wu.User)
            .WithMany(u => u.Workspaces)
            .HasForeignKey(wu => wu.UserId);

        // WorkspaceInvitation
        b.Entity<WorkspaceInvitation>()
            .HasOne(i => i.Workspace)
            .WithMany(w => w.Invitations)
            .HasForeignKey(i => i.WorkspaceId);

        // Workspace → Projects 
        b.Entity<Workspace>()
            .HasMany(w => w.Projects)
            .WithOne(p => p.Workspace)
            .HasForeignKey(p => p.WorkspaceId)
            .OnDelete(DeleteBehavior.Restrict);

        // Workspace Owner (EXPLICIT one-to-many)
        b.Entity<Workspace>()
            .HasOne(w => w.Owner)
            .WithMany()
            .HasForeignKey(w => w.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);


        // ============================
        // Existing mappings preserved
        // ============================

        // ProjectMember (composite key)
        b.Entity<ProjectMember>().HasKey(pm => new { pm.ProjectId, pm.UserId });

        b.Entity<ProjectMember>()
            .HasOne(pm => pm.Project)
            .WithMany(p => p.Members)
            .HasForeignKey(pm => pm.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Entity<ProjectMember>()
            .HasOne(pm => pm.User)
            .WithMany(u => u.ProjectMemberships)
            .HasForeignKey(pm => pm.UserId);

        b.Entity<ProjectMember>()
            .HasOne(pm => pm.Role)
            .WithMany()
            .HasForeignKey(pm => pm.RoleId);

        // Team
        b.Entity<Team>()
            .HasOne(t => t.Project)
            .WithMany(p => p.Teams)
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        // TeamMember
        b.Entity<TeamMember>().HasKey(tm => new { tm.TeamId, tm.UserId });

        b.Entity<TeamMember>()
            .HasOne(tm => tm.Team)
            .WithMany(t => t.Members)
            .HasForeignKey(tm => tm.TeamId);

        b.Entity<TeamMember>()
            .HasOne(tm => tm.User)
            .WithMany()
            .HasForeignKey(tm => tm.UserId);

        // Epic
        b.Entity<Epic>(eb =>
        {
            eb.HasKey(e => e.Id);

            eb.HasOne(e => e.Project)
              .WithMany(p => p.Epics)
              .HasForeignKey(e => e.ProjectId)
              .OnDelete(DeleteBehavior.Restrict);

            eb.HasOne(e => e.CreatedBy)
              .WithMany()
              .HasForeignKey(e => e.CreatedById)
              .OnDelete(DeleteBehavior.SetNull);

            eb.Property(e => e.Title)
              .IsRequired()
              .HasMaxLength(250);
        });

        // Sprint
        b.Entity<Sprint>(spb =>
        {
            spb.HasKey(s => s.Id);

            spb.HasOne(s => s.Project)
               .WithMany(p => p.Sprints)
               .HasForeignKey(s => s.ProjectId)
               .OnDelete(DeleteBehavior.Restrict);

            spb.HasOne(s => s.Team)
               .WithMany()
               .HasForeignKey(s => s.TeamId)
               .OnDelete(DeleteBehavior.Restrict);

            spb.Property(s => s.Name)
               .IsRequired()
               .HasMaxLength(200);


            b.Entity<Sprint>()
    .HasOne(s => s.CreatedBy)
    .WithMany()
    .HasForeignKey(s => s.CreatedById)
    .OnDelete(DeleteBehavior.NoAction);

        });

        // UserStory
        b.Entity<UserStory>(sb =>
        {
            sb.HasKey(s => s.Id);

            sb.HasOne(s => s.Project)
              .WithMany(p => p.UserStories)
              .HasForeignKey(s => s.ProjectId)
              .OnDelete(DeleteBehavior.Restrict);

            sb.HasOne(s => s.Epic)
              .WithMany(e => e.UserStories)
              .HasForeignKey(s => s.EpicId)
              .OnDelete(DeleteBehavior.SetNull);

            sb.HasOne(s => s.Team)
              .WithMany()
              .HasForeignKey(s => s.TeamId)
              .OnDelete(DeleteBehavior.SetNull);

            sb.HasOne(s => s.Assignee)
              .WithMany()
              .HasForeignKey(s => s.AssigneeId)
              .OnDelete(DeleteBehavior.SetNull);

            sb.HasOne(s => s.Sprint)
              .WithMany(sp => sp.Stories)
              .HasForeignKey(s => s.SprintId)
              .OnDelete(DeleteBehavior.SetNull);

            sb.Property(s => s.Title)
              .IsRequired()
              .HasMaxLength(300);
        });

        // TaskItem
        b.Entity<TaskItem>(tb =>
        {
            tb.HasKey(t => t.Id);

            tb.HasOne(t => t.Project)
              .WithMany()
              .HasForeignKey(t => t.ProjectId)
              .OnDelete(DeleteBehavior.Cascade);

            tb.HasOne(t => t.Team)
              .WithMany()
              .HasForeignKey(t => t.TeamId)
              .OnDelete(DeleteBehavior.SetNull);

            tb.HasOne(t => t.Sprint)
              .WithMany()
              .HasForeignKey(t => t.SprintId)
              .OnDelete(DeleteBehavior.NoAction);


            tb.HasOne(t => t.Assignee)
              .WithMany()
              .HasForeignKey(t => t.AssigneeId)
              .OnDelete(DeleteBehavior.SetNull);
        });

        // ProjectRisk
        b.Entity<ProjectRisk>(rb =>
        {
            rb.HasKey(r => r.Id);

            rb.Property(r => r.Title)
              .IsRequired()
              .HasMaxLength(250);

            rb.Property(r => r.Category)
              .IsRequired()
              .HasMaxLength(80);

            rb.Property(r => r.Probability)
              .IsRequired()
              .HasMaxLength(20);

            rb.Property(r => r.Impact)
              .IsRequired()
              .HasMaxLength(20);

            rb.Property(r => r.Status)
              .IsRequired()
              .HasMaxLength(30);

            rb.Property(r => r.Consequence)
              .HasMaxLength(500);

            rb.HasOne(r => r.Project)
              .WithMany(p => p.Risks)   
              .HasForeignKey(r => r.ProjectId)
              .OnDelete(DeleteBehavior.Cascade);

            rb.HasOne(r => r.OwnerUser)
              .WithMany()
              .HasForeignKey(r => r.OwnerUserId)
              .OnDelete(DeleteBehavior.SetNull);

            rb.HasIndex(r => new { r.ProjectId, r.Status });
        });

        // -------------------- COMMENTS --------------------
        b.Entity<Comment>(cb =>
        {
            cb.HasKey(c => c.Id);

            cb.Property(c => c.EntityType)
              .IsRequired()
              .HasMaxLength(50);

            cb.Property(c => c.Content)
              .IsRequired()
              .HasMaxLength(4000);

            cb.HasOne(c => c.AuthorUser)
              .WithMany()
              .HasForeignKey(c => c.AuthorUserId)
              .OnDelete(DeleteBehavior.Restrict);

            cb.HasIndex(c => new { c.WorkspaceId, c.ProjectId, c.EntityType, c.EntityId });
        });

        // COMMENT MENTIONS 
        b.Entity<CommentMention>(mb =>
        {
            mb.HasKey(m => m.Id);

            mb.HasOne(m => m.Comment)
              .WithMany()
              .HasForeignKey(m => m.CommentId)
              .OnDelete(DeleteBehavior.Cascade);

            mb.HasOne(m => m.MentionedUser)
              .WithMany()
              .HasForeignKey(m => m.MentionedUserId)
              .OnDelete(DeleteBehavior.Restrict);

            mb.HasIndex(m => new { m.CommentId, m.MentionedUserId })
              .IsUnique();
        });
        //google connections
        b.Entity<GoogleConnection>()
    .HasOne(gc => gc.User)
    .WithMany()
    .HasForeignKey(gc => gc.UserId)
    .OnDelete(DeleteBehavior.Cascade);

        // NOTIFICATIONS 
        b.Entity<Notification>(nb =>
        {
            nb.HasKey(n => n.Id);

            nb.Property(n => n.Type)
              .IsRequired()
              .HasMaxLength(30);

            nb.Property(n => n.EntityType)
              .IsRequired()
              .HasMaxLength(50);

            nb.Property(n => n.Message)
              .IsRequired()
              .HasMaxLength(500);

            nb.HasOne(n => n.User)
              .WithMany()
              .HasForeignKey(n => n.UserId)
              .OnDelete(DeleteBehavior.Cascade);

            nb.HasIndex(n => new { n.WorkspaceId, n.UserId, n.IsRead, n.CreatedAt });
        });



        // Seed Roles
        b.Entity<Role>().HasData(
            new Role { Id = 1, Name = "ProductOwner" },
            new Role { Id = 2, Name = "ScrumMaster" },
            new Role { Id = 3, Name = "Developer" }
        );
    }
}
