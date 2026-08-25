$password = ConvertTo-SecureString "aeclklhpnwnnkaau" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential("hariharanrntgemini@gmail.com", $password)
try {
    Send-MailMessage -From "hariharanrntgemini@gmail.com" -To "hariharan@reshandthosh.com" -Subject "RIIMS V2 Test" -Body "Test Email Body" -SmtpServer "smtp.gmail.com" -Port 587 -UseSsl -Credential $credential -ErrorAction Stop
    Write-Host "SUCCESS: Email sent via Gmail SMTP!"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
