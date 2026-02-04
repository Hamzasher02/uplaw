# ============================================================
# UPLAW Timeline Feature - Automated Test Suite (PowerShell)
# ============================================================

# Configuration from environment or defaults
$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:5000" }
$CLIENT_TOKEN = $env:CLIENT_TOKEN
$OTHER_CLIENT_TOKEN = $env:OTHER_CLIENT_TOKEN
$LAWYER_TOKEN = $env:LAWYER_TOKEN
$OTHER_LAWYER_TOKEN = $env:OTHER_LAWYER_TOKEN
$CASE_ID = $env:CASE_ID
$PROPOSAL_ID = $env:PROPOSAL_ID

# Create output directory
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$OUTPUT_DIR = "tests\output"
if (!(Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR | Out-Null
}
$LOG_FILE = "$OUTPUT_DIR\timeline_test_results_$TIMESTAMP.log"

# Print header
$header = @"
============================================================
UPLAW Timeline Feature - Test Suite (PowerShell)
Started: $(Get-Date)
Base URL: $BASE_URL
============================================================

"@
$header | Tee-Object -FilePath $LOG_FILE

# Check required variables
Write-Host "Checking prerequisites..." -ForegroundColor Blue
$MISSING = @()

if (!$CLIENT_TOKEN) { $MISSING += "CLIENT_TOKEN" }
if (!$OTHER_CLIENT_TOKEN) { $MISSING += "OTHER_CLIENT_TOKEN" }
if (!$LAWYER_TOKEN) { $MISSING += "LAWYER_TOKEN" }
if (!$OTHER_LAWYER_TOKEN) { $MISSING += "OTHER_LAWYER_TOKEN" }
if (!$CASE_ID) { $MISSING += "CASE_ID" }
if (!$PROPOSAL_ID) { $MISSING += "PROPOSAL_ID" }

if ($MISSING.Count -gt 0) {
    Write-Host "ERROR: Missing required environment variables:" -ForegroundColor Red
    $MISSING | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Please set them before running:"
    Write-Host '  $env:CLIENT_TOKEN = "your_token"'
    Write-Host '  $env:OTHER_CLIENT_TOKEN = "other_client_token"'
    Write-Host '  $env:LAWYER_TOKEN = "lawyer_token"'
    Write-Host '  $env:OTHER_LAWYER_TOKEN = "other_lawyer_token"'
    Write-Host '  $env:CASE_ID = "case_id"'
    Write-Host '  $env:PROPOSAL_ID = "proposal_id"'
    exit 1
}

Write-Host "✓ All prerequisites met" -ForegroundColor Green
"" | Tee-Object -FilePath $LOG_FILE -Append

# Test counter
$script:TOTAL = 0
$script:PASSED = 0
$script:FAILED = 0

# Function to run test
function Run-Test {
    param(
        [string]$TestName,
        [string]$ExpectedStatus,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [hashtable]$Form = @{}
    )
    
    $script:TOTAL++
    
    $testHeader = @"

============================================================
TEST #$script:TOTAL: $TestName
Expected HTTP Status: $ExpectedStatus
------------------------------------------------------------
"@
    $testHeader | Tee-Object -FilePath $LOG_FILE -Append
    
    try {
        # Prepare request parameters
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
        }
        
        # Add body if JSON
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        # Add form data if multipart
        if ($Form.Count -gt 0) {
            $boundary = [System.Guid]::NewGuid().ToString()
            $params.ContentType = "multipart/form-data; boundary=$boundary"
            
            $bodyLines = @()
            foreach ($key in $Form.Keys) {
                $bodyLines += "--$boundary"
                $bodyLines += "Content-Disposition: form-data; name=`"$key`""
                $bodyLines += ""
                $bodyLines += $Form[$key]
            }
            $bodyLines += "--$boundary--"
            $params.Body = $bodyLines -join "`r`n"
        }
        
        # Make request
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $responseBody = $response.Content
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $responseBody = $_.ErrorDetails.Message
        if (!$responseBody) {
            $responseBody = $_.Exception.Message
        }
    }
    
    "HTTP Status: $statusCode" | Tee-Object -FilePath $LOG_FILE -Append
    "Response Body:" | Tee-Object -FilePath $LOG_FILE -Append
    $responseBody | Tee-Object -FilePath $LOG_FILE -Append
    
    # Check if status matches expected
    if ($statusCode -eq [int]$ExpectedStatus) {
        Write-Host "✓ PASSED" -ForegroundColor Green
        "✓ PASSED" | Tee-Object -FilePath $LOG_FILE -Append
        $script:PASSED++
    } else {
        Write-Host "✗ FAILED (Expected $ExpectedStatus, Got $statusCode)" -ForegroundColor Red
        "✗ FAILED (Expected $ExpectedStatus, Got $statusCode)" | Tee-Object -FilePath $LOG_FILE -Append
        $script:FAILED++
    }
}

# ============================================================
# TEST 1: Accept Proposal
# ============================================================
Run-Test -TestName "Accept Proposal - Timeline Auto-Created" `
    -ExpectedStatus "200" `
    -Method "PATCH" `
    -Url "$BASE_URL/api/v1/proposals/$PROPOSAL_ID/respond" `
    -Headers @{ "Authorization" = "Bearer $CLIENT_TOKEN" } `
    -Body '{"action":"accept"}'

# ============================================================
# TEST 2: Get Timeline
# ============================================================
Run-Test -TestName "Get Timeline (Client Owner)" `
    -ExpectedStatus "200" `
    -Method "GET" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/timeline" `
    -Headers @{ "Authorization" = "Bearer $CLIENT_TOKEN" }

# ============================================================
# TEST 3: Submit Phase 1
# ============================================================
Run-Test -TestName "Submit Phase 1 - Case Intake (Success)" `
    -ExpectedStatus "200" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-intake/submit" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" } `
    -Form @{ "lawyerRemarks" = "Initial documents collected and reviewed" }

# ============================================================
# TEST 4: Submit Phase 1 Again
# ============================================================
Run-Test -TestName "Submit Phase 1 Again (Should Fail - Completed)" `
    -ExpectedStatus "400" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-intake/submit" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" } `
    -Form @{ "lawyerRemarks" = "Trying to resubmit" }

# ============================================================
# TEST 5: Submit Phase 3 Out of Order
# ============================================================
Run-Test -TestName "Submit Phase 3 Out of Order (Should Fail)" `
    -ExpectedStatus "400" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/trial-preparation/submit" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" } `
    -Form @{ "lawyerRemarks" = "Skipping phase 2" }

# ============================================================
# TEST 6: Submit Phase 2
# ============================================================
Run-Test -TestName "Submit Phase 2 - Case Filed (Success)" `
    -ExpectedStatus "200" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-filed/submit" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" } `
    -Form @{ "lawyerRemarks" = "Case filed with court successfully" }

# ============================================================
# TEST 7: Submit Phase 3
# ============================================================
Run-Test -TestName "Submit Phase 3 - Trial Preparation (Success)" `
    -ExpectedStatus "200" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/trial-preparation/submit" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" } `
    -Form @{ "lawyerRemarks" = "All trial documents prepared" }

# ============================================================
# TEST 8: Complete Court Hearing Without Subphase
# ============================================================
Run-Test -TestName "Complete Court Hearing Without Subphase (Should Fail)" `
    -ExpectedStatus "400" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/court-hearing/complete" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" }

# ============================================================
# TEST 9: Add Court Hearing Subphase
# ============================================================
Run-Test -TestName "Add Court Hearing Subphase (Success)" `
    -ExpectedStatus "200" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/court-hearing/subphases" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" } `
    -Form @{ "name" = "First Hearing Session"; "lawyerRemarks" = "Strong arguments presented in court" }

# ============================================================
# TEST 10: Complete Court Hearing
# ============================================================
Run-Test -TestName "Complete Court Hearing Phase (Success)" `
    -ExpectedStatus "200" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/court-hearing/complete" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" }

# ============================================================
# TEST 11: Phase 5 Without Outcome
# ============================================================
Run-Test -TestName "Submit Phase 5 Without Outcome (Should Fail)" `
    -ExpectedStatus "400" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-outcome/submit" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" } `
    -Form @{ "lawyerRemarks" = "Case concluded" }

# ============================================================
# TEST 12: Phase 5 With Outcome
# ============================================================
Run-Test -TestName "Submit Phase 5 With Outcome (Success)" `
    -ExpectedStatus "200" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-outcome/submit" `
    -Headers @{ "Authorization" = "Bearer $LAWYER_TOKEN" } `
    -Form @{ "outcome" = "won"; "lawyerRemarks" = "Case successfully won for client" }

# ============================================================
# TEST 13: Unauthorized Client GET Timeline
# ============================================================
Run-Test -TestName "Unauthorized Client GET Timeline (Should Fail)" `
    -ExpectedStatus "403" `
    -Method "GET" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/timeline" `
    -Headers @{ "Authorization" = "Bearer $OTHER_CLIENT_TOKEN" }

# ============================================================
# TEST 14: Unauthorized Lawyer Submit Phase
# ============================================================
Run-Test -TestName "Unauthorized Lawyer Submit Phase (Should Fail)" `
    -ExpectedStatus "403" `
    -Method "POST" `
    -Url "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-intake/submit" `
    -Headers @{ "Authorization" = "Bearer $OTHER_LAWYER_TOKEN" } `
    -Form @{ "lawyerRemarks" = "Unauthorized attempt" }

# ============================================================
# Test Summary
# ============================================================
$summary = @"

============================================================
TEST SUMMARY
============================================================
Total Tests: $script:TOTAL
Passed: $script:PASSED
Failed: $script:FAILED
Completed: $(Get-Date)
Log saved to: $LOG_FILE
============================================================
"@

$summary | Tee-Object -FilePath $LOG_FILE -Append

if ($script:PASSED -eq $script:TOTAL) {
    Write-Host "All tests passed!" -ForegroundColor Green
} else {
    Write-Host "$script:FAILED test(s) failed" -ForegroundColor Red
    exit 1
}
