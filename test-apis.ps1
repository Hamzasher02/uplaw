# UPLAW API Full Test Suite
# Tests ALL APIs and generates detailed report

$baseUrl = "http://localhost:3000/api/v1"
$email = "smapp024@gmail.com"
$password = "password123"

$results = @()
$accessToken = ""
$refreshToken = ""

function Test-API {
    param (
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [string]$Body = "",
        [bool]$ExpectFail = $false
    )
    
    $result = @{
        Name         = $Name
        Method       = $Method
        Endpoint     = $Endpoint
        Status       = "FAIL"
        StatusCode   = 0
        Message      = ""
        ResponseTime = 0
        Headers      = @{}
    }
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $params = @{
            Uri             = "$baseUrl$Endpoint"
            Method          = $Method
            Headers         = $Headers
            UseBasicParsing = $true
        }
        
        if ($Body -and $Method -ne "GET") {
            $params.Body = $Body
        }
        
        $response = Invoke-WebRequest @params
        $stopwatch.Stop()
        
        $result.StatusCode = $response.StatusCode
        $result.ResponseTime = $stopwatch.ElapsedMilliseconds
        $result.Headers = $response.Headers
        
        $content = $response.Content | ConvertFrom-Json
        if ($content[0].success) {
            $result.Status = "PASS"
            $result.Message = $content[0].message
        }
        else {
            $result.Message = $content[0].message
        }
    }
    catch {
        $result.StatusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $result.Message = $_.Exception.Message
        if ($ExpectFail) {
            $result.Status = "EXPECTED"
        }
    }
    
    return $result
}

Write-Host @"
================================================================================
                        UPLAW API FULL TEST REPORT
================================================================================
Test Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Base URL: $baseUrl
Test Account: $email
================================================================================

"@ -ForegroundColor Cyan

# ============ AUTH TESTS ============
Write-Host "### AUTHENTICATION APIS ###" -ForegroundColor Yellow

# 1. Login
Write-Host "`n[1/25] Testing POST /auth/login..." -NoNewline
$headers = @{ "Content-Type" = "application/json"; "x-client-type" = "app" }
$body = @{ identifier = $email; password = $password } | ConvertTo-Json
$loginResult = Test-API -Name "Login (Unified)" -Method "POST" -Endpoint "/auth/login" -Headers $headers -Body $body

if ($loginResult.Headers["Authorization"]) {
    $accessToken = ($loginResult.Headers["Authorization"] -replace "Bearer ", "").Trim()
    $refreshToken = $loginResult.Headers["x-refresh-token"].Trim()
    $loginResult.Message += " | Tokens in headers: YES"
}
$results += $loginResult
Write-Host " [$($loginResult.Status)] $($loginResult.ResponseTime)ms" -ForegroundColor $(if ($loginResult.Status -eq "PASS") { "Green" }else { "Red" })

# 2. Get Current User
Write-Host "[2/25] Testing GET /auth/me..." -NoNewline
$authHeaders = @{ "Authorization" = "Bearer $accessToken" }
$meResult = Test-API -Name "Get Current User" -Method "GET" -Endpoint "/auth/me" -Headers $authHeaders
$results += $meResult
Write-Host " [$($meResult.Status)] $($meResult.ResponseTime)ms" -ForegroundColor $(if ($meResult.Status -eq "PASS") { "Green" }else { "Red" })

# 3. Refresh Token
Write-Host "[3/25] Testing POST /auth/refresh-token..." -NoNewline
$headers = @{ "Content-Type" = "application/json"; "x-client-type" = "app" }
$body = @{ refreshToken = $refreshToken } | ConvertTo-Json
$refreshResult = Test-API -Name "Refresh Token" -Method "POST" -Endpoint "/auth/refresh-token" -Headers $headers -Body $body
if ($refreshResult.Headers["Authorization"]) {
    $accessToken = ($refreshResult.Headers["Authorization"] -replace "Bearer ", "").Trim()
    $refreshToken = $refreshResult.Headers["x-refresh-token"].Trim()
    $refreshResult.Message += " | New tokens in headers: YES"
}
$results += $refreshResult
Write-Host " [$($refreshResult.Status)] $($refreshResult.ResponseTime)ms" -ForegroundColor $(if ($refreshResult.Status -eq "PASS") { "Green" }else { "Red" })

# 4. Forgot Password
Write-Host "[4/25] Testing POST /auth/forgot-password..." -NoNewline
$headers = @{ "Content-Type" = "application/json" }
$body = @{ identifier = $email } | ConvertTo-Json
$forgotResult = Test-API -Name "Forgot Password (Unified)" -Method "POST" -Endpoint "/auth/forgot-password" -Headers $headers -Body $body
$results += $forgotResult
Write-Host " [$($forgotResult.Status)] $($forgotResult.ResponseTime)ms" -ForegroundColor $(if ($forgotResult.Status -eq "PASS") { "Green" }else { "Red" })

# 5. Resend OTP (will fail without valid context but tests endpoint)
Write-Host "[5/25] Testing POST /auth/resend-otp..." -NoNewline
$headers = @{ "Content-Type" = "application/json" }
$body = @{ email = $email; type = "email" } | ConvertTo-Json
$resendResult = Test-API -Name "Resend OTP" -Method "POST" -Endpoint "/auth/resend-otp" -Headers $headers -Body $body
$results += $resendResult
Write-Host " [$($resendResult.Status)] $($resendResult.ResponseTime)ms" -ForegroundColor $(if ($resendResult.Status -eq "PASS") { "Green" }elseif ($resendResult.Status -eq "EXPECTED") { "Yellow" }else { "Red" })

# 6. Verify OTP (will fail without valid OTP)
Write-Host "[6/25] Testing POST /auth/verify-otp (expected fail)..." -NoNewline
$headers = @{ "Content-Type" = "application/json"; "x-client-type" = "app" }
$body = @{ email = $email; otp = "000000" } | ConvertTo-Json
$verifyResult = Test-API -Name "Verify OTP" -Method "POST" -Endpoint "/auth/verify-otp" -Headers $headers -Body $body -ExpectFail $true
$results += $verifyResult
Write-Host " [$($verifyResult.Status)] (Invalid OTP test)" -ForegroundColor Yellow

# 7. Verify Reset OTP (will fail without valid OTP)
Write-Host "[7/25] Testing POST /auth/verify-reset-otp (expected fail)..." -NoNewline
$headers = @{ "Content-Type" = "application/json" }
$body = @{ email = $email; otp = "000000" } | ConvertTo-Json
$verifyResetResult = Test-API -Name "Verify Reset OTP" -Method "POST" -Endpoint "/auth/verify-reset-otp" -Headers $headers -Body $body -ExpectFail $true
$results += $verifyResetResult
Write-Host " [$($verifyResetResult.Status)] (Invalid OTP test)" -ForegroundColor Yellow

# 8. Reset Password (will fail without valid token)
Write-Host "[8/25] Testing POST /auth/reset-password (expected fail)..." -NoNewline
$headers = @{ "Content-Type" = "application/json" }
$body = @{ email = $email; resetToken = "invalid"; newPassword = "test123"; confirmNewPassword = "test123" } | ConvertTo-Json
$resetResult = Test-API -Name "Reset Password" -Method "POST" -Endpoint "/auth/reset-password" -Headers $headers -Body $body -ExpectFail $true
$results += $resetResult
Write-Host " [$($resetResult.Status)] (Invalid token test)" -ForegroundColor Yellow

# ============ CLIENT PROFILE TESTS ============
Write-Host "`n### CLIENT PROFILE APIS ###" -ForegroundColor Yellow

# 9. Get Client Profile
Write-Host "[9/25] Testing GET /client/profile..." -NoNewline
$authHeaders = @{ "Authorization" = "Bearer $accessToken" }
$clientProfileResult = Test-API -Name "Get Client Profile" -Method "GET" -Endpoint "/client/profile" -Headers $authHeaders
$results += $clientProfileResult
Write-Host " [$($clientProfileResult.Status)] $($clientProfileResult.ResponseTime)ms" -ForegroundColor $(if ($clientProfileResult.Status -eq "PASS") { "Green" }else { "Red" })

# 10. Update Client Profile (without file - just check endpoint)
Write-Host "[10/25] Testing PATCH /client/profile..." -NoNewline
$authHeaders = @{ "Authorization" = "Bearer $accessToken"; "Content-Type" = "application/json" }
$body = @{ city = "Lahore" } | ConvertTo-Json
$updateClientResult = Test-API -Name "Update Client Profile" -Method "PATCH" -Endpoint "/client/profile" -Headers $authHeaders -Body $body
$results += $updateClientResult
Write-Host " [$($updateClientResult.Status)] $($updateClientResult.ResponseTime)ms" -ForegroundColor $(if ($updateClientResult.Status -eq "PASS") { "Green" }else { "Red" })

# ============ LAWYER PROFILE TESTS (Expected to fail for client user) ============
Write-Host "`n### LAWYER PROFILE APIS (Expected 403 for client user) ###" -ForegroundColor Yellow

# 11-22 Lawyer endpoints
$lawyerEndpoints = @(
    @{ Name = "Get Lawyer Profile"; Method = "GET"; Endpoint = "/lawyer/profile" },
    @{ Name = "Get Completion Status"; Method = "GET"; Endpoint = "/lawyer/profile/completion" }
)

$testNum = 11
foreach ($ep in $lawyerEndpoints) {
    Write-Host "[$testNum/25] Testing $($ep.Method) $($ep.Endpoint)..." -NoNewline
    $authHeaders = @{ "Authorization" = "Bearer $accessToken" }
    $result = Test-API -Name $ep.Name -Method $ep.Method -Endpoint $ep.Endpoint -Headers $authHeaders -ExpectFail $true
    $results += $result
    Write-Host " [$($result.Status)] (Client cannot access lawyer)" -ForegroundColor Yellow
    $testNum++
}

# ============ HEALTH & UTILITY ============
Write-Host "`n### UTILITY APIS ###" -ForegroundColor Yellow

# Health Check
Write-Host "[$testNum/25] Testing GET /health..." -NoNewline
$healthResult = Test-API -Name "Health Check" -Method "GET" -Endpoint "/health"
$results += $healthResult
Write-Host " [$($healthResult.Status)] $($healthResult.ResponseTime)ms" -ForegroundColor $(if ($healthResult.Status -eq "PASS") { "Green" }else { "Red" })
$testNum++

# Welcome
Write-Host "[$testNum/25] Testing GET / (Welcome)..." -NoNewline
$welcomeResult = Test-API -Name "Welcome" -Method "GET" -Endpoint "/"
$results += $welcomeResult
Write-Host " [$($welcomeResult.Status)] $($welcomeResult.ResponseTime)ms" -ForegroundColor $(if ($welcomeResult.Status -eq "PASS") { "Green" }else { "Red" })
$testNum++

# Logout
Write-Host "[$testNum/25] Testing GET /auth/logout..." -NoNewline
$authHeaders = @{ "Authorization" = "Bearer $accessToken" }
$logoutResult = Test-API -Name "Logout" -Method "GET" -Endpoint "/auth/logout" -Headers $authHeaders
$results += $logoutResult
Write-Host " [$($logoutResult.Status)] $($logoutResult.ResponseTime)ms" -ForegroundColor $(if ($logoutResult.Status -eq "PASS") { "Green" }else { "Red" })

# ============ SUMMARY ============
Write-Host @"

================================================================================
                              TEST SUMMARY
================================================================================
"@ -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$expected = ($results | Where-Object { $_.Status -eq "EXPECTED" }).Count
$total = $results.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Expected Failures: $expected" -ForegroundColor Yellow
Write-Host "Success Rate: $([math]::Round(($passed / ($passed + $failed)) * 100, 1))%" -ForegroundColor Cyan

Write-Host "`n--------------------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "DETAILED RESULTS:" -ForegroundColor White
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Gray

foreach ($r in $results) {
    $color = switch ($r.Status) { "PASS" { "Green" } "FAIL" { "Red" } default { "Yellow" } }
    Write-Host "[$($r.Status.PadRight(8))] $($r.Method.PadRight(6)) $($r.Endpoint.PadRight(35)) $($r.ResponseTime)ms" -ForegroundColor $color
}

Write-Host "`n================================================================================`n" -ForegroundColor Cyan
