namespace HiveonBackend.Dtos
{
    public class SprintRiskDto
    {
        public string RiskLevel { get; set; } = "Low";
        public List<RiskItemDto> Risks { get; set; } = new();
    }

    public class RiskItemDto
    {
        public string Type { get; set; } = "";
        public string Description { get; set; } = "";
        public string Severity { get; set; } = "";
        public string Suggestion { get; set; } = "";
    }
}
