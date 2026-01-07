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
        var smtp = new SmtpClient
        {
            Host = _config["Email:SmtpHost"],
            Port = int.Parse(_config["Email:SmtpPort"]),
            EnableSsl = true,
            Credentials = new NetworkCredential(
                _config["Email:Username"],
                _config["Email:Password"]
            )
        };

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

Or click the link below:
{inviteUrl}

This invitation expires in 7 days.

— Hiveon Team
",
            IsBodyHtml = false
        };

        message.To.Add(toEmail);

        await smtp.SendMailAsync(message);
    }
}
