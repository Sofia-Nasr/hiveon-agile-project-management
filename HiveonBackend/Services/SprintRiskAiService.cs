using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using HiveonBackend.Data;
using HiveonBackend.Dtos;

namespace HiveonBackend.Services
{
    public class SprintRiskAiService
    {
        private readonly AppDbContext _db;
        private readonly HttpClient _http;
        private readonly IConfiguration _config;

        public SprintRiskAiService(
            AppDbContext db,
            HttpClient http,
            IConfiguration config)
        {
            _db = db;
            _http = http;
            _config = config;
        }

        public async Task<SprintRiskDto> AnalyzeAsync(Guid sprintId, Guid workspaceId)
        {
            // 🔒 workspace-safe sprint load
            var sprint = await _db.Sprints
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s =>
                    s.Id == sprintId &&
                    s.Project.WorkspaceId == workspaceId);

            if (sprint == null)
                throw new Exception("Sprint not found in workspace.");

            var stories = await _db.UserStories
                .Where(s => s.SprintId == sprintId)
                .ToListAsync();

            var tasks = await _db.Tasks
                .Where(t => t.SprintId == sprintId)
                .ToListAsync();

            // 📊 deterministic metrics (NO AI here)
            int totalItems = stories.Count + tasks.Count;
            int inProgress =
                stories.Count(s => s.Status == "In Progress") +
                tasks.Count(t => t.Status == "In Progress");

            int unassigned =
                stories.Count(s => s.AssigneeId == null) +
                tasks.Count(t => t.AssigneeId == null);

            int highSeverityBugs = tasks.Count(t =>
                t.IsBug &&
                t.BugSeverity != null &&
                t.BugSeverity.ToString() == "High");

            var prompt = $@"
You are an Agile sprint risk management assistant.

Sprint name: {sprint.Name}
Sprint dates: {sprint.StartDate:d} → {sprint.EndDate:d}

Metrics:
- Total items: {totalItems}
- In progress: {inProgress}
- Unassigned: {unassigned}
- High severity bugs: {highSeverityBugs}

Analyze sprint risk and return ONLY valid JSON in this exact format:

{{
  ""riskLevel"": ""Low | Medium | High"",
  ""risks"": [
    {{
      ""type"": ""Schedule | Quality | Ownership | Scope"",
      ""description"": ""short explanation"",
      ""severity"": ""Low | Medium | High"",
      ""suggestion"": ""actionable mitigation step""
    }}
  ]
}}
";

            var requestBody = new
            {
                model = _config["Ai:Model"],
                messages = new[]
                {
                    new { role = "user", content = prompt }
                }
            };

            var res = await _http.PostAsJsonAsync(
                $"{_config["Ai:BaseUrl"]}/api/chat",
                requestBody);

            var raw = await res.Content.ReadAsStringAsync();

            // 🛡 VERY SAFE parse (no crash if AI rambles)
            try
            {
                return JsonSerializer.Deserialize<SprintRiskDto>(
                           raw,
                           new JsonSerializerOptions
                           {
                               PropertyNameCaseInsensitive = true
                           })
                       ?? new SprintRiskDto { RiskLevel = "Medium" };
            }
            catch
            {
                return new SprintRiskDto
                {
                    RiskLevel = "Medium",
                    Risks =
                    {
                        new RiskItemDto
                        {
                            Type = "AI",
                            Severity = "Medium",
                            Description = "AI response could not be parsed.",
                            Suggestion = "Review sprint workload manually."
                        }
                    }
                };
            }
        }
    }
}
