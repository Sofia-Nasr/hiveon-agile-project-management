using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

public interface IEmailService
{
    Task SendInviteEmail(
        string toEmail,
        string workspaceName,
        string inviteUrl,
        string joinCode,
        string role
    );

    Task SendMentionEmail(
        string toEmail,
        string commentContent,
        string entityType,
        string entityId
    );
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public EmailService(
        IConfiguration config,
        IHttpClientFactory httpClientFactory
    )
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    public async Task SendInviteEmail(
        string toEmail,
        string workspaceName,
        string inviteUrl,
        string joinCode,
        string role
    )
    {
        var apiKey = _config["Email:ApiKey"];
        var fromEmail = _config["Email:FromEmail"];

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException(
                "Missing email configuration: Email:ApiKey"
            );

        if (string.IsNullOrWhiteSpace(fromEmail))
            throw new InvalidOperationException(
                "Missing email configuration: Email:FromEmail"
            );

        var messageText = $@"
You’ve been invited to join the workspace ""{workspaceName}"" on Hiveon.

Role assigned: {role}

Join code:
{joinCode}

Invite link:
{inviteUrl}

— Hiveon Team
";

        var payload = new
        {
            from = fromEmail,
            to = toEmail,
            subject = $"You're invited to join {workspaceName} on Hiveon",
            text = messageText
        };

        var client = _httpClientFactory.CreateClient();

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);

        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.PostAsync(
            "https://api.resend.com/emails",
            content
        );

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();

            throw new InvalidOperationException(
                $"Resend send failed: {response.StatusCode}: {body}"
            );
        }
    }

    public async Task SendMentionEmail(
        string toEmail,
        string commentContent,
        string entityType,
        string entityId
    )
    {
        var apiKey = _config["Email:ApiKey"];
        var fromEmail = _config["Email:FromEmail"];

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException(
                "Missing email configuration: Email:ApiKey"
            );

        if (string.IsNullOrWhiteSpace(fromEmail))
            throw new InvalidOperationException(
                "Missing email configuration: Email:FromEmail"
            );

        var frontendUrl = _config["Frontend:BaseUrl"];
        var link = $"{frontendUrl}/sprints";

        var messageText = $@"
You were mentioned in a comment on Hiveon.

Comment:
""{commentContent}""

View here:
{link}

— Hiveon
";

        var payload = new
        {
            from = fromEmail,
            to = toEmail,
            subject = "You were mentioned on Hiveon",
            text = messageText
        };

        var client = _httpClientFactory.CreateClient();

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);

        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.PostAsync(
            "https://api.resend.com/emails",
            content
        );

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();

            throw new InvalidOperationException(
                $"Resend send failed: {response.StatusCode}: {body}"
            );
        }
    }
}