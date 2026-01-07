namespace HiveonBackend.Models
{
    public class Role
    {
        public int Id { get; set; }                 // 1=ProjectManager, 2=TeamLead, 3=Developer
        public string Name { get; set; } = string.Empty;
    }
}
