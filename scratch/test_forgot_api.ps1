$body = @{ email = "hariharan@reshandthosh.com" } | ConvertTo-Json
try {
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/forgot-password" -Method Post -Body $body -ContentType "application/json"
    Write-Host "RESPONSE SUCCESS:" ($res | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "HTTP ERROR: $($_.Exception.Message)"
}
