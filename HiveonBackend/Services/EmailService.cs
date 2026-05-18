using System;
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

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendInviteEmail(
    string toEmail,
    string workspaceName,
    string inviteUrl,
    string joinCode,
    string role
)
{
    var apiKey = _config["Brevo:ApiKey"];

    using var client = new HttpClient();

    client.DefaultRequestHeaders.Add("api-key", apiKey);

    var htmlBody = $@"
<div style='font-family: Arial, sans-serif; background-color:#f5f7fb; padding:40px 20px;'>

    <div style='max-width:600px; margin:auto; background:white; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;'>

        <div style='padding:32px; text-align:center;'>

            <h1 style='margin:0; color:#111827;'>Hiveon</h1>

            <p style='margin-top:18px; color:#6b7280; font-size:15px;'>
                You’ve been invited to collaborate on a workspace.
            </p>

            <p style='font-size:16px; color:#111827;'>
                Join <strong>{workspaceName}</strong>
            </p>

            <p style='font-size:15px; color:#374151;'>
                Role: <strong>{role}</strong>
            </p>

            <div style='margin-top:20px;'>

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
        </div>
    </div>
</div>
";

    var body = new
    {
        sender = new
        {
            name = "Hiveon",
            email = _config["Email:FromEmail"]
        },

        to = new[]
        {
            new { email = toEmail }
        },

        subject = $"You're invited to join {workspaceName} on Hiveon",

        htmlContent = htmlBody
    };

    var json = JsonSerializer.Serialize(body);

    var response = await client.PostAsync(
        "https://api.brevo.com/v3/smtp/email",
        new StringContent(json, Encoding.UTF8, "application/json")
    );

    var result = await response.Content.ReadAsStringAsync();

Console.WriteLine(result);

if (!response.IsSuccessStatusCode)
{
    throw new Exception(
        $"Brevo API Error: {response.StatusCode} - {result}"
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
    var apiKey = _config["Brevo:ApiKey"];

    using var client = new HttpClient();

    client.DefaultRequestHeaders.Add("api-key", apiKey);

    var frontendUrl = _config["Frontend:BaseUrl"];
    var link = $"{frontendUrl}/sprints";

    var body = new
    {
        sender = new
        {
            name = "Hiveon",
            email = _config["Email:FromEmail"]
        },

        to = new[]
        {
            new { email = toEmail }
        },

        subject = "You were mentioned on Hiveon",

        textContent = $@"
You were mentioned in a comment on Hiveon.

Comment:
{commentContent}

View here:
{link}

— Hiveon
"
    };

    var json = JsonSerializer.Serialize(body);

    var response = await client.PostAsync(
        "https://api.brevo.com/v3/smtp/email",
        new StringContent(json, Encoding.UTF8, "application/json")
    );

    var result = await response.Content.ReadAsStringAsync();

    Console.WriteLine(result);

if (!response.IsSuccessStatusCode)
{
    throw new Exception(
        $"Brevo API Error: {response.StatusCode} - {result}"
    );
}
}

   
}