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
        if (string.IsNullOrWhiteSpace(toEmail))
            throw new ArgumentException("Recipient email is required.", nameof(toEmail));

        if (string.IsNullOrWhiteSpace(workspaceName))
            throw new ArgumentException("Workspace name is required.", nameof(workspaceName));

        var smtp = BuildSmtpClient();

        var fromEmail = _config["Email:FromEmail"];
        var fromName = _config["Email:FromName"] ?? "Hiveon";

        if (string.IsNullOrWhiteSpace(fromEmail))
            throw new InvalidOperationException("Missing email configuration: Email:FromEmail");

        var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
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
        if (string.IsNullOrWhiteSpace(toEmail))
            throw new ArgumentException("Recipient email is required.", nameof(toEmail));

        var smtp = BuildSmtpClient();

        var fromEmail = _config["Email:FromEmail"];
        var fromName = _config["Email:FromName"] ?? "Hiveon";

        if (string.IsNullOrWhiteSpace(fromEmail))
            throw new InvalidOperationException("Missing email configuration: Email:FromEmail");

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


— Hiveon
",
            IsBodyHtml = false
        };

        message.To.Add(toEmail);

        await smtp.SendMailAsync(message);
    }

    private SmtpClient BuildSmtpClient()
    {
        var host = _config["Email:SmtpHost"];
        var portValue = _config["Email:SmtpPort"];
        var username = _config["Email:Username"];
        var password = _config["Email:Password"];

        if (string.IsNullOrWhiteSpace(host))
            throw new InvalidOperationException("Missing email configuration: Email:SmtpHost");

        if (string.IsNullOrWhiteSpace(portValue))
            throw new InvalidOperationException("Missing email configuration: Email:SmtpPort");

        if (!int.TryParse(portValue, out var port))
            throw new InvalidOperationException("Invalid email configuration: Email:SmtpPort must be a number.");

        if (string.IsNullOrWhiteSpace(username))
            throw new InvalidOperationException("Missing email configuration: Email:Username");

        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("Missing email configuration: Email:Password");

        return new SmtpClient
        {
            Host = host,
            Port = port,
            EnableSsl = true,
            Credentials = new NetworkCredential(
                username,
                password
            )
        };
    }
}