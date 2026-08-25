using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        string host = "smtp.gmail.com";
        int port = 587;
        string username = "hariharanrntgemini@gmail.com";
        string password = "aeclklhpnwnnkaau";
        string from = "hariharanrntgemini@gmail.com";
        string to = "hariharan@reshandthosh.com";

        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls13;

        try
        {
            using var client = new SmtpClient(host, port)
            {
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(username, password),
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 30000
            };

            var message = new MailMessage(from, to, "RIIMS V2 C# Test", "Testing SmtpClient Send")
            {
                IsBodyHtml = true
            };

            Console.WriteLine("Sending via Task.Run(client.Send)...");
            await Task.Run(() => client.Send(message));
            Console.WriteLine("SUCCESS: Email sent via .NET SmtpClient!");
        }
        catch (Exception ex)
        {
            Console.WriteLine("FAILED: " + ex.ToString());
        }
    }
}
