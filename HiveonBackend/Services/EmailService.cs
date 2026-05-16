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

        var htmlBody = $@"
<div style='font-family: Arial, sans-serif; background-color:#f5f7fb; padding:40px 20px;'>
    
    <div style='max-width:600px; margin:auto; background:white; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;'>

        <div style='padding:32px 32px 16px 32px; text-align:center;'>

            <div style='display:inline-flex; align-items:center; gap:10px;'>

                <div style='width:18px; height:18px; background:#f5b301;
                            clip-path: polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%);'>
                </div>

                <span style='font-size:28px; font-weight:700; color:#111827;'>
                    Hiveon
                </span>
            </div>

            <p style='margin-top:18px; color:#6b7280; font-size:15px; line-height:1.6;'>
                You’ve been invited to collaborate on a workspace.
            </p>
        </div>

        <div style='padding:0 32px 32px 32px;'>

            <div style='background:#f9fafb; border:1px solid #e5e7eb;
                        border-radius:14px; padding:24px;'>

                <p style='margin:0; color:#111827; font-size:16px;'>
                    You’ve been invited to join
                    <strong>{workspaceName}</strong>
                    on Hiveon.
                </p>

                <p style='margin-top:16px; color:#374151; font-size:15px;'>
                    Your assigned role:
                    <strong>{role}</strong>
                </p>

                <div style='margin-top:28px; text-align:center;'>

                    <p style='margin-bottom:10px; color:#6b7280; font-size:13px; letter-spacing:0.5px; text-transform:uppercase;'>
                        Workspace Join Code
                    </p>

                    <div style='display:inline-block;
                                background:#111827;
                                color:white;
                                padding:14px 22px;
                                border-radius:12px;
                                font-size:24px;
                                font-weight:700;
                                letter-spacing:3px;'>

                        {joinCode}
                    </div>
                </div>

                <p style='margin-top:28px; color:#6b7280; font-size:14px; line-height:1.6;'>
                    Open Hiveon, choose
                    <strong>Join Workspace</strong>,
                    and enter the code above to get started.
                </p>
            </div>

            <p style='margin-top:28px; text-align:center; color:#9ca3af; font-size:13px;'>
                Built for modern agile teams ✨
            </p>

        </div>
    </div>
</div>
";

        var payload = new
        {
            from = fromEmail,
            to = toEmail,
            subject = $"You're invited to join {workspaceName} on Hiveon",
            html = htmlBody
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