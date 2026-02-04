# UPLAW Timeline Feature - Testing Guide

## Overview

This directory contains comprehensive testing tools for the UPLAW Case Timeline Phases feature:

- **Bash Script** (`timeline-tests.sh`) - For Linux/macOS
- **PowerShell Script** (`timeline-tests.ps1`) - For Windows
- **Postman Collection** (`postman/uplaw-timeline.postman_collection.json`) - 14 automated tests
- **Postman Environment** (`postman/uplaw-timeline.postman_environment.json`) - Environment variables

---

## Prerequisites

### 1. Server Running

Start your UPLAW backend server:

```bash
npm start
# or
node server.js
```

Default server URL: `http://localhost:5000`

### 2. Create Test Accounts

You need **4 user accounts** for complete testing:

#### Client 1 (Case Owner)
- Register via: `POST /api/v1/auth/register`
- Body:
  ```json
  {
    "name": "Test Client 1",
    "email": "client1@test.com",
    "password": "password123",
    "role": "client"
  }
  ```
- Save the returned `token` as `CLIENT_TOKEN`

#### Client 2 (Unauthorized)
- Register via: `POST /api/v1/auth/register`
- Body:
  ```json
  {
    "name": "Test Client 2",
    "email": "client2@test.com",
    "password": "password123",
    "role": "client"
  }
  ```
- Save the returned `token` as `OTHER_CLIENT_TOKEN`

#### Lawyer 1 (To Be Assigned)
- Register via: `POST /api/v1/auth/register`
- Body:
  ```json
  {
    "name": "Test Lawyer 1",
    "email": "lawyer1@test.com",
    "password": "password123",
    "role": "lawyer"
  }
  ```
- Save the returned `token` as `LAWYER_TOKEN`

#### Lawyer 2 (Unauthorized)
- Register via: `POST /api/v1/auth/register`
- Body:
  ```json
  {
    "name": "Test Lawyer 2",
    "email": "lawyer2@test.com",
    "password": "password123",
    "role": "lawyer"
  }
  ```
- Save the returned `token` as `OTHER_LAWYER_TOKEN`

### 3. Create Test Case & Proposal

#### Step 1: Client 1 Creates a Case

```bash
curl -X POST http://localhost:5000/api/v1/cases \
  -H "Authorization: Bearer {CLIENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Property Dispute Case",
    "description": "Legal assistance needed for property boundary dispute",
    "category": "civil",
    "priority": "high"
  }'
```

**Save the returned `_id` as `CASE_ID`**

#### Step 2: Client 1 Invites Lawyer 1

First, get Lawyer 1's user ID from their profile or lawyers list.

```bash
curl -X POST http://localhost:5000/api/v1/cases/{CASE_ID}/invite \
  -H "Authorization: Bearer {CLIENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lawyerIds": ["{LAWYER_1_USER_ID}"]
  }'
```

#### Step 3: Lawyer 1 Creates a Proposal

```bash
curl -X POST http://localhost:5000/api/v1/proposals \
  -H "Authorization: Bearer {LAWYER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "{CASE_ID}",
    "estimatedCost": 50000,
    "estimatedDuration": "3-6 months",
    "proposalText": "I will handle your property dispute case professionally"
  }'
```

**Save the returned `_id` as `PROPOSAL_ID`**

---

## Running Tests

### Option 1: Bash Script (Linux/macOS)

#### Set Environment Variables

```bash
export BASE_URL="http://localhost:5000"
export CLIENT_TOKEN="eyJhbGc..."
export OTHER_CLIENT_TOKEN="eyJhbGc..."
export LAWYER_TOKEN="eyJhbGc..."
export OTHER_LAWYER_TOKEN="eyJhbGc..."
export CASE_ID="507f1f77bcf86cd799439011"
export PROPOSAL_ID="507f1f77bcf86cd799439012"
```

#### Run Tests

```bash
chmod +x tests/timeline-tests.sh
./tests/timeline-tests.sh
```

**Output:** Results saved to `tests/output/timeline_test_results_{timestamp}.log`

---

### Option 2: PowerShell Script (Windows)

#### Set Environment Variables

```powershell
$env:BASE_URL = "http://localhost:5000"
$env:CLIENT_TOKEN = "eyJhbGc..."
$env:OTHER_CLIENT_TOKEN = "eyJhbGc..."
$env:LAWYER_TOKEN = "eyJhbGc..."
$env:OTHER_LAWYER_TOKEN = "eyJhbGc..."
$env:CASE_ID = "507f1f77bcf86cd799439011"
$env:PROPOSAL_ID = "507f1f77bcf86cd799439012"
```

#### Run Tests

```powershell
.\tests\timeline-tests.ps1
```

**Output:** Results saved to `tests\output\timeline_test_results_{timestamp}.log`

---

### Option 3: Postman Collection

#### Import Collection & Environment

1. Open Postman
2. Click **Import**
3. Import `tests/postman/uplaw-timeline.postman_collection.json`
4. Import `tests/postman/uplaw-timeline.postman_environment.json`

#### Configure Environment

1. Select **UPLAW Timeline - Test Environment**
2. Click the eye icon to edit variables
3. Set the following values:

| Variable | Value | Example |
|----------|-------|---------|
| `baseUrl` | Server URL | `http://localhost:5000` |
| `clientToken` | Client 1 token | `eyJhbGc...` |
| `otherClientToken` | Client 2 token | `eyJhbGc...` |
| `lawyerToken` | Lawyer 1 token | `eyJhbGc...` |
| `otherLawyerToken` | Lawyer 2 token | `eyJhbGc...` |
| `caseId` | Case ID | `507f1f77bcf86cd799439011` |
| `proposalId` | Proposal ID | `507f1f77bcf86cd799439012` |

#### Run Collection

1. Right-click collection → **Run collection**
2. Click **Run UPLAW - Timeline Feature Tests**
3. View automated test results with pass/fail indicators

---

## Test Scenarios

The test suite covers 14 comprehensive scenarios:

### 1. Accept Proposal (Timeline Auto-Created)
- **Method:** `PATCH /api/v1/proposals/{proposalId}/respond`
- **Auth:** Client 1 (owner)
- **Expected:** 200 OK, timeline auto-created

### 2. Get Timeline (Client Owner)
- **Method:** `GET /api/v1/cases/{caseId}/timeline`
- **Auth:** Client 1 (owner)
- **Expected:** 200 OK, 5 phases returned, phase 1 = ongoing

### 3. Submit Phase 1 - Case Intake (Success)
- **Method:** `POST /api/v1/cases/{caseId}/phases/case-intake/submit`
- **Auth:** Lawyer 1 (assigned)
- **Expected:** 200 OK, progress = 20%, phase 2 = ongoing

### 4. Submit Phase 1 Again (Should Fail)
- **Expected:** 400 Bad Request, error about completed phase

### 5. Submit Phase 3 Out of Order (Should Fail)
- **Expected:** 400 Bad Request, error about pending phase

### 6. Submit Phase 2 - Case Filed (Success)
- **Expected:** 200 OK, progress = 40%

### 7. Submit Phase 3 - Trial Preparation (Success)
- **Expected:** 200 OK, progress = 60%

### 8. Complete Court Hearing Without Subphase (Should Fail)
- **Expected:** 400 Bad Request, error about subphase required

### 9. Add Court Hearing Subphase (Success)
- **Method:** `POST /api/v1/cases/{caseId}/phases/court-hearing/subphases`
- **Expected:** 200 OK, subphase count = 1

### 10. Complete Court Hearing Phase (Success)
- **Method:** `POST /api/v1/cases/{caseId}/phases/court-hearing/complete`
- **Expected:** 200 OK, progress = 80%

### 11. Submit Phase 5 Without Outcome (Should Fail)
- **Expected:** 400 Bad Request, error about outcome required

### 12. Submit Phase 5 With Outcome (Success)
- **Body:** `outcome=won`
- **Expected:** 200 OK, progress = 100%, case status = completed

### 13. Unauthorized Client GET Timeline (Should Fail)
- **Auth:** Client 2 (not owner)
- **Expected:** 403 Forbidden

### 14. Unauthorized Lawyer Submit Phase (Should Fail)
- **Auth:** Lawyer 2 (not assigned)
- **Expected:** 403 Forbidden

---

## Important Notes

### Timeline Auto-Creation

✅ **Timeline is auto-created when a client accepts a proposal**
- No manual timeline creation needed
- Happens in `proposal.services.js` → `respondToProposalService`
- Phase 1 starts as `ongoing`, rest are `pending`

### Phase Sequence Enforcement

✅ **Phases MUST be completed in order:**
1. Phase 1: Case Intake
2. Phase 2: Case Filed
3. Phase 3: Trial Preparation
4. Phase 4: Court Hearing (with subphases)
5. Phase 5: Case Outcome/Closure

⚠️ Attempting to submit a pending phase will fail with 400 error

### Write-Once Protection

✅ **Completed phases cannot be modified**
- Once a phase is marked `completed`, it's locked
- Attempting to resubmit returns 400 error

### Phase 4 Special Rules

✅ **Court Hearing requires at least 1 subphase**
- Cannot complete phase 4 without adding a subphase first
- Add subphases via: `POST /api/v1/cases/{caseId}/phases/court-hearing/subphases`
- Complete via: `POST /api/v1/cases/{caseId}/phases/court-hearing/complete`

### Phase 5 Special Rules

✅ **Case Outcome requires an outcome type**
- Valid values: `won`, `settled`, `dismissed`
- Missing outcome returns 400 error
- Completing phase 5 sets case status to `completed`

---

## Troubleshooting

### Tests Fail with 401 Unauthorized
- Check that tokens are valid and not expired
- Ensure tokens were copied correctly (no extra spaces)

### Tests Fail with 404 Not Found
- Verify `CASE_ID` and `PROPOSAL_ID` are correct
- Ensure case and proposal were created successfully

### Tests Fail with 403 Forbidden
- Verify you're using the correct token for each test
- Client 1 should own the case
- Lawyer 1 should be assigned (via proposal acceptance)

### Timeline Not Auto-Created
- Ensure proposal was accepted (not just created)
- Check server logs for errors in `createTimelineService`

### Phase Submission Fails
- Verify phase is in `ongoing` status
- Check that previous phases are completed
- For phase 5, ensure `outcome` field is included

---

## Expected Test Results

**All 14 tests should PASS if:**
- Prerequisites are correctly set up
- Environment variables are valid
- Tests are run in sequence (proposals accepted before timeline operations)

**Pass Rate:** 14/14 (100%)

**Typical Runtime:**
- Bash/PowerShell: ~15-30 seconds
- Postman: ~10-20 seconds

---

## Support

For issues or questions about the timeline feature:
1. Review implementation in `/services/timeline.services.js`
2. Check validation rules in `/services/timeline.validator.services.js`
3. Verify routes in `/router/case.router.js`
4. Check error handling in `/middleware/customerrorhandler.middleware.js`
