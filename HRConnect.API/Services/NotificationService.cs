using System.Net;
using System.Net.Mail;
using HRConnect.API.Models;
using Microsoft.Extensions.Configuration;

namespace HRConnect.API.Services;

public interface INotificationService
{
    Task SendLeaveStatusEmailAsync(LeaveRequest leave);
}

public class NotificationService : INotificationService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(IConfiguration configuration, ILogger<NotificationService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendLeaveStatusEmailAsync(LeaveRequest leave)
    {
        var employeeEmail = leave.Employee?.User?.Email;
        if (string.IsNullOrWhiteSpace(employeeEmail))
        {
            _logger.LogWarning("Skipping leave status email because employee email is missing for leave {LeaveId}", leave.Id);
            return;
        }

        var host = _configuration["Email:SmtpHost"];
        var port = int.TryParse(_configuration["Email:SmtpPort"], out var parsedPort) ? parsedPort : 587;
        var from = _configuration["Email:FromAddress"];
        var username = _configuration["Email:Username"];
        var password = _configuration["Email:Password"];

        var subject = $"Leave Request Update: {leave.Status}";
        var body = $@"Hello {leave.Employee?.User?.FullName ?? "Employee"},

Your leave request has been updated.

Status: {leave.Status}
Leave Type: {leave.LeaveType}
From: {leave.StartDate:yyyy-MM-dd}
To: {leave.EndDate:yyyy-MM-dd}
Comments: {leave.AdminComments ?? "N/A"}

Regards,
HRConnect";

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
        {
            _logger.LogInformation("Email config not set. Simulated leave notification to {Email} for leave {LeaveId}. Status: {Status}", employeeEmail, leave.Id, leave.Status);
            return;
        }

        try
        {
            using var client = new SmtpClient(host, port)
            {
                EnableSsl = true,
                Credentials = !string.IsNullOrWhiteSpace(username)
                    ? new NetworkCredential(username, password)
                    : CredentialCache.DefaultNetworkCredentials
            };

            using var message = new MailMessage(from, employeeEmail, subject, body);
            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send leave status email for leave {LeaveId}", leave.Id);
        }
    }
}
