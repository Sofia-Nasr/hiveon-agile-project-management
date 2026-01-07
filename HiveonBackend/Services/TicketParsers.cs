using System;
using HiveonBackend.Models;

namespace HiveonBackend.Dtos
{
    public static class TicketParsers
    {
        public static IssueSeverity? ParseSeverity(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;

            return value switch
            {
                "S1" => IssueSeverity.Critical, // ✅ ADD THIS
                "S2" => IssueSeverity.High,
                "S3" => IssueSeverity.Medium,
                "S4" => IssueSeverity.Low,
                _ => null
            };
        }

        

        public static BugProbability? ParseProbability(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;

            return value switch
            {
                "P1" => BugProbability.P1,
                "P2" => BugProbability.P2,
                "P3" => BugProbability.P3,
                "P4" => BugProbability.P4,
                _ => null
            };
        }

        public static BugEnvironment? ParseEnvironment(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            return Enum.TryParse<BugEnvironment>(s, true, out var val) ? val : null;
        }
    }
}
