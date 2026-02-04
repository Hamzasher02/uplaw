#!/bin/bash

# ============================================================
# UPLAW Timeline Feature - Automated Test Suite (Bash)
# ============================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration from environment or defaults
BASE_URL="${BASE_URL:-http://localhost:5000}"
CLIENT_TOKEN="${CLIENT_TOKEN}"
OTHER_CLIENT_TOKEN="${OTHER_CLIENT_TOKEN}"
LAWYER_TOKEN="${LAWYER_TOKEN}"
OTHER_LAWYER_TOKEN="${OTHER_LAWYER_TOKEN}"
CASE_ID="${CASE_ID}"
PROPOSAL_ID="${PROPOSAL_ID}"

# Create output directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="tests/output"
mkdir -p "$OUTPUT_DIR"
LOG_FILE="$OUTPUT_DIR/timeline_test_results_$TIMESTAMP.log"

# Print header
echo "============================================================" | tee "$LOG_FILE"
echo "UPLAW Timeline Feature - Test Suite" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "Base URL: $BASE_URL" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Check required variables
echo -e "${BLUE}Checking prerequisites...${NC}" | tee -a "$LOG_FILE"
MISSING=""

if [ -z "$CLIENT_TOKEN" ]; then
    MISSING="${MISSING}\n- CLIENT_TOKEN"
fi
if [ -z "$OTHER_CLIENT_TOKEN" ]; then
    MISSING="${MISSING}\n- OTHER_CLIENT_TOKEN"
fi
if [ -z "$LAWYER_TOKEN" ]; then
    MISSING="${MISSING}\n- LAWYER_TOKEN"
fi
if [ -z "$OTHER_LAWYER_TOKEN" ]; then
    MISSING="${MISSING}\n- OTHER_LAWYER_TOKEN"
fi
if [ -z "$CASE_ID" ]; then
    MISSING="${MISSING}\n- CASE_ID"
fi
if [ -z "$PROPOSAL_ID" ]; then
    MISSING="${MISSING}\n- PROPOSAL_ID"
fi

if [ -n "$MISSING" ]; then
    echo -e "${RED}ERROR: Missing required environment variables:${NC}" | tee -a "$LOG_FILE"
    echo -e "$MISSING" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    echo "Please set them before running:" | tee -a "$LOG_FILE"
    echo "  export CLIENT_TOKEN='your_token'" | tee -a "$LOG_FILE"
    echo "  export OTHER_CLIENT_TOKEN='other_client_token'" | tee -a "$LOG_FILE"
    echo "  export LAWYER_TOKEN='lawyer_token'" | tee -a "$LOG_FILE"
    echo "  export OTHER_LAWYER_TOKEN='other_lawyer_token'" | tee -a "$LOG_FILE"
    echo "  export CASE_ID='case_id'" | tee -a "$LOG_FILE"
    echo "  export PROPOSAL_ID='proposal_id'" | tee -a "$LOG_FILE"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Test counter
TOTAL=0
PASSED=0
FAILED=0

# Function to run test
run_test() {
    local TEST_NAME="$1"
    local EXPECTED_STATUS="$2"
    shift 2
    
    TOTAL=$((TOTAL + 1))
    
    echo "============================================================" | tee -a "$LOG_FILE"
    echo "TEST #$TOTAL: $TEST_NAME" | tee -a "$LOG_FILE"
    echo "Expected HTTP Status: $EXPECTED_STATUS" | tee -a "$LOG_FILE"
    echo "------------------------------------------------------------" | tee -a "$LOG_FILE"
    
    # Run curl and capture both status and response
    RESPONSE=$(curl -s -w "\n%{http_code}" "$@")
    HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    echo "HTTP Status: $HTTP_STATUS" | tee -a "$LOG_FILE"
    echo "Response Body:" | tee -a "$LOG_FILE"
    echo "$BODY" | tee -a "$LOG_FILE"
    
    # Check if status matches expected
    if [ "$HTTP_STATUS" = "$EXPECTED_STATUS" ]; then
        echo -e "${GREEN}✓ PASSED${NC}" | tee -a "$LOG_FILE"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED (Expected $EXPECTED_STATUS, Got $HTTP_STATUS)${NC}" | tee -a "$LOG_FILE"
        FAILED=$((FAILED + 1))
    fi
    
    echo "" | tee -a "$LOG_FILE"
}

# ============================================================
# TEST 1: Accept Proposal (Timeline Auto-Created)
# ============================================================
run_test "Accept Proposal - Timeline Auto-Created" "200" \
    -X PATCH \
    -H "Authorization: Bearer $CLIENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"action":"accept"}' \
    "$BASE_URL/api/v1/proposals/$PROPOSAL_ID/respond"

# ============================================================
# TEST 2: Get Timeline (Client - Owner)
# ============================================================
run_test "Get Timeline (Client Owner)" "200" \
    -X GET \
    -H "Authorization: Bearer $CLIENT_TOKEN" \
    "$BASE_URL/api/v1/cases/$CASE_ID/timeline"

# ============================================================
# TEST 3: Submit Phase 1 (Success)
# ============================================================
run_test "Submit Phase 1 - Case Intake (Success)" "200" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    -F "lawyerRemarks=Initial documents collected and reviewed" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-intake/submit"

# ============================================================
# TEST 4: Submit Phase 1 Again (Should Fail - Already Completed)
# ============================================================
run_test "Submit Phase 1 Again (Should Fail - Completed)" "400" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    -F "lawyerRemarks=Trying to resubmit" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-intake/submit"

# ============================================================
# TEST 5: Submit Phase 3 Out of Order (Should Fail - Still Pending)
# ============================================================
run_test "Submit Phase 3 Out of Order (Should Fail)" "400" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    -F "lawyerRemarks=Skipping phase 2" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/trial-preparation/submit"

# ============================================================
# TEST 6: Submit Phase 2 (Success)
# ============================================================
run_test "Submit Phase 2 - Case Filed (Success)" "200" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    -F "lawyerRemarks=Case filed with court successfully" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-filed/submit"

# ============================================================
# TEST 7: Submit Phase 3 (Success)
# ============================================================
run_test "Submit Phase 3 - Trial Preparation (Success)" "200" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    -F "lawyerRemarks=All trial documents prepared" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/trial-preparation/submit"

# ============================================================
# TEST 8: Complete Court Hearing Without Subphase (Should Fail)
# ============================================================
run_test "Complete Court Hearing Without Subphase (Should Fail)" "400" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/court-hearing/complete"

# ============================================================
# TEST 9: Add Court Hearing Subphase (Success)
# ============================================================
run_test "Add Court Hearing Subphase (Success)" "200" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    -F "name=First Hearing Session" \
    -F "lawyerRemarks=Strong arguments presented in court" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/court-hearing/subphases"

# ============================================================
# TEST 10: Complete Court Hearing (Success)
# ============================================================
run_test "Complete Court Hearing Phase (Success)" "200" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/court-hearing/complete"

# ============================================================
# TEST 11: Phase 5 Without Outcome (Should Fail)
# ============================================================
run_test "Submit Phase 5 Without Outcome (Should Fail)" "400" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    -F "lawyerRemarks=Case concluded" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-outcome/submit"

# ============================================================
# TEST 12: Phase 5 With Outcome (Success)
# ============================================================
run_test "Submit Phase 5 With Outcome (Success)" "200" \
    -X POST \
    -H "Authorization: Bearer $LAWYER_TOKEN" \
    -F "outcome=won" \
    -F "lawyerRemarks=Case successfully won for client" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-outcome/submit"

# ============================================================
# TEST 13: Unauthorized Client GET Timeline (Should Fail)
# ============================================================
run_test "Unauthorized Client GET Timeline (Should Fail)" "403" \
    -X GET \
    -H "Authorization: Bearer $OTHER_CLIENT_TOKEN" \
    "$BASE_URL/api/v1/cases/$CASE_ID/timeline"

# ============================================================
# TEST 14: Unauthorized Lawyer Submit Phase (Should Fail)
# ============================================================
run_test "Unauthorized Lawyer Submit Phase (Should Fail)" "403" \
    -X POST \
    -H "Authorization: Bearer $OTHER_LAWYER_TOKEN" \
    -F "lawyerRemarks=Unauthorized attempt" \
    "$BASE_URL/api/v1/cases/$CASE_ID/phases/case-intake/submit"

# ============================================================
# Test Summary
# ============================================================
echo "============================================================" | tee -a "$LOG_FILE"
echo "TEST SUMMARY" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
echo "Total Tests: $TOTAL" | tee -a "$LOG_FILE"
echo -e "${GREEN}Passed: $PASSED${NC}" | tee -a "$LOG_FILE"
echo -e "${RED}Failed: $FAILED${NC}" | tee -a "$LOG_FILE"
echo "Completed: $(date)" | tee -a "$LOG_FILE"
echo "Log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"

# Exit with error if any tests failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi
