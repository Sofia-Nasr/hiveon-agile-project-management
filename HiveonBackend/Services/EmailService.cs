using System;
using System.Net;
using System.Net.Mail;
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
        var smtp = BuildSmtpClient();

        var fromEmail = _config["Email:FromEmail"];
        var fromName = _config["Email:FromName"] ?? "Hiveon";

        var htmlBody = $@"
<div style='font-family: Arial, sans-serif; background-color:#f5f7fb; padding:40px 20px;'>

    <div style='max-width:600px; margin:auto; background:white; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;'>

        <div style='padding:32px 32px 16px 32px; text-align:center;'>

            <div style='display:inline-flex; align-items:center; gap:10px;'>

                <div style='font-size:24px; color:#f5b301; line-height:1;'>
                    ⬢
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

        var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = $"You're invited to join {workspaceName} on Hiveon",
            Body = htmlBody,
            IsBodyHtml = true
        };

        message.To.Add(toEmail);

        await smtp.SendMailAsync(message);
    }

    public async Task SendMentionEmail(
        string toEmail,
        string commentContent,
        string entityType,
        string entityId
    )
    {
        var smtp = BuildSmtpClient();

        var fromEmail = _config["Email:FromEmail"];
        var fromName = _config["Email:FromName"] ?? "Hiveon";

        var frontendUrl = _config["Frontend:BaseUrl"];
        var link = $"{frontendUrl}/sprints";

        var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = "You were mentioned on Hiveon",
            Body = $@"
You were mentioned in a comment on Hiveon.

Comment:
""{commentContent}""

View here:
{link}

— Hiveon
",
            IsBodyHtml = false
        };

        message.To.Add(toEmail);

        await smtp.SendMailAsync(message);
    }

    private SmtpClient BuildSmtpClient()
    {
        return new SmtpClient(
            _config["Email:SmtpHost"],
            int.Parse(_config["Email:SmtpPort"])
        )
        {
            EnableSsl = true,
            UseDefaultCredentials = false,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Credentials = new NetworkCredential(
                _config["Email:Username"],
                _config["Email:Password"]
            )
        };
    }
}