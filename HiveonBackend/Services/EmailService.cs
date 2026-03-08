using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
public interface IEmailService
{
    Task SendInviteEmail(string toEmail, string workspaceName, string inviteUrl, string joinCode, string role);
    Task SendMentionEmail(string toEmail, string commentContent, string entityType, string entityId);
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

        var message = new MailMessage
        {
            From = new MailAddress(
                _config["Email:FromEmail"],
                _config["Email:FromName"]
            ),
            Subject = $"You're invited to join {workspaceName} on Hiveon",
            Body = $@"
You’ve been invited to join the workspace ""{workspaceName}"" on Hiveon.

Role assigned: {role}

Join code:
{joinCode}



— Hiveon Team
",
            IsBodyHtml = false
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

        var frontendUrl = _config["Frontend:BaseUrl"]; 
        var link = $"{frontendUrl}/sprints"; 

        var message = new MailMessage
        {
            From = new MailAddress(
                _config["Email:FromEmail"],
                _config["Email:FromName"]
            ),
            Subject = "You were mentioned on Hiveon",
            Body = $@"
You were mentioned in a comment on Hiveon.

Comment:
""{commentContent}""


— Hiveon
",
            IsBodyHtml = false
        };

        message.To.Add(toEmail);

        await smtp.SendMailAsync(message);
    }

    private SmtpClient BuildSmtpClient()
    {
        return new SmtpClient
        {
            Host = _config["Email:SmtpHost"],
            Port = int.Parse(_config["Email:SmtpPort"]),
            EnableSsl = true,
            Credentials = new NetworkCredential(
                _config["Email:Username"],
                _config["Email:Password"]
            )
        };
    }
}