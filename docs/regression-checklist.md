# Regression Testing Checklist

## Purpose
Use this checklist after making changes to services, utilities, or validators to ensure no breaking changes.

---

## Response Envelope Standard

**CRITICAL:** All API responses in this project use an **array wrapper** containing a single object.

### Standard Format
```json
[{
    "success": true,
    "message": "Operation successful",
    "data": { ... }
}]
```

### Rules
- ✅ All responses are **arrays** containing one object: `[{ success, message, data }]`
- ✅ `data` can be an object or array depending on the endpoint
- ❌ **Never change array wrapper to plain object** (Zero Behavior Change rule)

### Examples
```json
// Single resource
[{ "success": true, "data": { "user": {...} } }]

// Collection
[{ "success": true, "data": { "cases": [...], "count": 5 } }]

// Error
[{ "success": false, "message": "Error description", "data": null }]
```

---

## Quick Smoke Test (6 Calls)

**Run these 6 endpoints after ANY service change to verify system health.**

> **CRITICAL:** All controllers respond with ARRAY wrapper: `res.json([{...}])`

### 1. POST /api/auth/login
**Role:** Any (Client/Lawyer)
**Web Mode:**
```json
[{
  "success": true,
  "message": "Login successful",
  "data": { "user": {...}, "accessToken": "..." }
}]
```
**App Mode** (header: `x-client-type: app`):
```json
[{
  "success": true,
  "message": "Login successful",
  "data": { "user": {...} }
}]
```
(Tokens in headers: `Authorization`, `x-refresh-token`)

### 2. GET /api/auth/me
**Role:** Authenticated
```json
[{
  "success": true,
  "message": "Current user data fetched",
  "data": { "fullName": "...", "email": "...", "role": "..." }
}]
```

### 3. GET /api/lawyers/profile
**Role:** Lawyer
```json
[{
  "success": true,
  "message": "Profile fetched successfully",
  "data": { "completion": {...}, ...profileFields }
}]
```

### 4. GET /api/clients/profile
**Role:** Client
```json
[{
  "success": true,
  "message": "Profile fetched successfully",
  "data": { ...userAndProfileFields }
}]
```

### 5. GET /api/cases (Controller: `getMyCases`)
**Role:** Client
```json
[{
  "success": true,
  "message": "Cases retrieved successfully",
  "data": {
    "cases": [...],
    "counts": { "total": N, "active": N, "pending": N, "assigned": N, "completed": N, "cancelled": N }
  }
}]
```

### 6. GET /api/proposals/received
**Role:** Client
```json
[{
  "success": true,
  "message": "Proposals retrieved successfully",
  "data": { "proposals": [...], "count": N }
}]
```

---

## Authentication Endpoints

### Client Registration
```bash
POST /api/auth/register/client
Content-Type: multipart/form-data

{
  "fullName": "Test Client",
  "fatherName": "Test Father",
  "email": "testclient@example.com",
  "phoneNumber": "+923001234567",
  "password": "test123",
  "confirmPassword": "test123"
}
# Optional: profilePicture file
```
**Expected**: 201 Created, `[{ "success": true, "message": "Registration successful. OTP sent to your email.", "data": { "userId": "...", "email": "..." } }]`

### Lawyer Registration
```bash
POST /api/auth/register/lawyer
Content-Type: multipart/form-data

{
  "fullName": "Test Lawyer",
  "email": "testlawyer@example.com",
  "phoneNumber": "+923009876543",
  "barCouncil": "Lahore Bar",
  "licenseNo": "LAW123",
  "city": "Lahore",
  "password": "test123",
  "confirmPassword": "test123"
}
```
**Expected**: 201 Created, `[{ "success": true, "message": "Registration successful. OTP sent to your email.", "data": { "userId": "...", "email": "..." } }]`

### Verify Account
```bash
POST /api/auth/verify-account
Content-Type: application/json

{
  "email": "testclient@example.com",
  "otp": "123456"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Account verified successfully", "data": { "user": {...}, "accessToken": "..." } }]` (Web) OR `[{ "success": true, "message": "Account verified successfully", "data": { "user": {...} } }]` (App - tokens in headers)

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "testclient@example.com",
  "password": "test123"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Login successful", "data": { "user": {...}, "accessToken": "..." } }]` (Web) OR `[{ "success": true, "message": "Login successful", "data": { "user": {...} } }]` (App - tokens in headers)

### Refresh Token
```bash
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Token refreshed successfully", "data": { "accessToken": "..." } }]` (Web) OR `[{ "success": true, "message": "Token refreshed successfully", "data": {} }]` (App - tokens in headers)

### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Logged out successfully", "data": [] }]`

### Forgot Password
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "identifier": "testclient@example.com"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Password reset OTP sent to your email", "data": { "userId": "..." } }]`

### Verify Reset OTP
```bash
POST /api/auth/verify-reset-otp
Content-Type: application/json

{
  "email": "testclient@example.com",
  "otp": "123456"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "OTP verified. You can now reset your password.", "data": { "resetToken": "..." } }]`

### Reset Password
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "testclient@example.com",
  "resetToken": "<reset_token>",
  "newPassword": "newpass123",
  "confirmNewPassword": "newpass123"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Password reset successful. Please login with your new password.", "data": [] }]`

---

## Lawyer Profile Endpoints

### GET Profile
```bash
GET /api/lawyers/profile
Authorization: Bearer <lawyer_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Profile fetched successfully", "data": { "completion": {...}, ...profileFields } }]`

### PATCH Profile (Unified)
```bash
PATCH /api/lawyers/profile
Authorization: Bearer <lawyer_access_token>
Content-Type: multipart/form-data

{
  "fullName": "Updated Name",
  "city": "Karachi",
  "areasOfPractice": "[\"Criminal Law\", \"Family Law\"]",
  "courtJurisdiction": "[\"Supreme Court\"]",
  "languagesSpoken": "[\"en\", \"ur\"]",
  "servicesOffered": "[\"Consultation\", \"Litigation\"]",
  "practiceLocations": "[{\"location\": \"Lahore\", \"availabilityStatus\": \"available\"}]"
}
# Optional files: profilePhoto, cnicDocument, barLicenseDocument, degreeCertificate
```
**Expected**: 200 OK, `[{ "success": true, "message": "Profile updated successfully", "data": {...} }]` (all JSON arrays parsed correctly)

### PATCH Step 3 (Validation Test)
```bash
PATCH /api/lawyers/profile/step3
Authorization: Bearer <lawyer_access_token>
Content-Type: application/json

{
  "servicesOffered": "[\"S1\", \"S2\", \"S3\", \"S4\", \"S5\", \"S6\", \"S7\", \"S8\"]"
}
```
**Expected**: 400 Bad Request, `[{ "success": false, "message": "Services offered cannot exceed 7 items", "data": null }]`

### PATCH Step 4 (practiceLocations Parsing)
```bash
PATCH /api/lawyers/profile/step4
Authorization: Bearer <lawyer_access_token>
Content-Type: application/json

{
  "practiceLocations": "[{\"location\": \"Islamabad\", \"availabilityStatus\": \"available\"}]"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Performance & availability updated", "data": {...} }]` (practiceLocations parsed as array)

### GET Completion
```bash
GET /api/lawyers/profile/completion
Authorization: Bearer <lawyer_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Completion status fetched", "data": { "percentage": N, "currentStep": N, "stepsCompleted": [...], "isComplete": false } }]`

---

## Client Profile Endpoints

### GET Profile
```bash
GET /api/clients/profile
Authorization: Bearer <client_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Profile fetched successfully", "data": { ...userAndProfileFields } }]`

### PATCH Profile (Without Files)
```bash
PATCH /api/clients/profile
Authorization: Bearer <client_access_token>
Content-Type: application/json

{
  "city": "Karachi",
  "bio": "Test bio"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Profile updated successfully", "data": {...} }]`

### PATCH Profile (With Files)
```bash
PATCH /api/clients/profile
Authorization: Bearer <client_access_token>
Content-Type: multipart/form-data

{
  "city": "Lahore"
}
# Attach: profilePicture (editable)
# Attach: cnicDocument (one-time only)
```
**Expected**: 200 OK, `[{ "success": true, "message": "Profile updated successfully", "data": {...} }]` (profilePicture updated, cnicDocument only if first time)

---

## Case Endpoints

### GET Client Cases (getMyCases)
```bash
GET /api/cases
Authorization: Bearer <client_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Cases retrieved successfully", "data": { "cases": [...], "counts": { "total": N, "active": N, "pending": N, "assigned": N, "completed": N, "cancelled": N } } }]`

### GET Case by ID
```bash
GET /api/cases/<case_id>
Authorization: Bearer <client_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Case retrieved successfully", "data": { "case": {...} } }]` (ownership enforced)

### GET Suggested Lawyers
```bash
GET /api/cases/<case_id>/lawyers
Authorization: Bearer <client_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Suggested lawyers retrieved successfully", "data": { "lawyers": [...], "count": N } }]`

### POST Invite Lawyers
```bash
POST /api/cases/<case_id>/invite
Authorization: Bearer <client_access_token>
Content-Type: application/json

{
  "lawyerIds": ["<lawyer_id_1>", "<lawyer_id_2>"]
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Successfully invited N lawyer(s)", "data": { "invited": N, "skipped": N } }]`

### GET Lawyer Received Cases
```bash
GET /api/cases/received
Authorization: Bearer <lawyer_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Received cases retrieved successfully", "data": { "invitations": [...], "count": N } }]`

### PATCH Case Status
```bash
PATCH /api/cases/<case_id>/status
Authorization: Bearer <client_access_token>
Content-Type: application/json

{
  "status": "active"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Case status updated successfully", "data": { "case": {...} } }]`

---

## Proposal Endpoints

### GET Received Proposals (Client)
```bash
GET /api/proposals/received
Authorization: Bearer <client_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Proposals retrieved successfully", "data": { "proposals": [...], "count": N } }]` (with lawyerProfile enrichment)

### GET Sent Proposals (Lawyer)
```bash
GET /api/proposals/sent
Authorization: Bearer <lawyer_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Proposals retrieved successfully", "data": { "proposals": [...], "count": N } }]`

### GET Proposal by ID
```bash
GET /api/proposals/<proposal_id>
Authorization: Bearer <access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Proposal retrieved successfully", "data": { "proposal": {...} } }]` (with lawyerProfile)

### POST Create Proposal
```bash
POST /api/proposals
Authorization: Bearer <lawyer_access_token>
Content-Type: application/json

{
  "caseId": "<case_id>",
  "proposedFee": 50000,
  "coverLetter": "I am interested in this case"
}
```
**Expected**: 201 Created, `[{ "success": true, "message": "Proposal submitted successfully", "data": { "proposal": {...} } }]`

### PATCH Respond to Proposal
```bash
PATCH /api/proposals/<proposal_id>/respond
Authorization: Bearer <client_access_token>
Content-Type: application/json

{
  "action": "accept"
}
```
**Expected**: 200 OK, `[{ "success": true, "message": "Proposal accepted successfully", "data": { "proposal": {...} } }]`

### PATCH Withdraw Proposal
```bash
PATCH /api/proposals/<proposal_id>/withdraw
Authorization: Bearer <lawyer_access_token>
```
**Expected**: 200 OK, `[{ "success": true, "message": "Proposal withdrawn successfully", "data": { "proposal": {...} } }]`

---

## Critical Validations to Test

### JSON Parsing (parseJsonField)
- ✅ String arrays parsed correctly: `"[\"item1\", \"item2\"]"` → `["item1", "item2"]`
- ✅ Already-parsed arrays passed through: `["item1"]` → `["item1"]`
- ✅ Invalid JSON returns fallback: `"invalid"` → `[]`

### File Uploads (handleFileUpload)
- ✅ New file uploaded successfully
- ✅ Old file deleted when replaced
- ✅ No error if file is null/undefined

### One-Time Fields (Client Profile)
- ✅ `fullName`, `fatherName`, `cnic` only set if currently empty
- ✅ Subsequent updates to these fields are ignored
- ✅ `profilePicture` can be updated anytime
- ✅ `cnicDocument` only uploaded once

### Array Validations (Lawyer Profile)
- ✅ `servicesOffered` max 7 items enforced
- ✅ Empty arrays allowed for optional fields

### Profile Completion (Lawyer)
- ✅ `completion` object present in GET profile response
- ✅ Completion percentage calculated correctly
- ✅ Steps marked as completed when fields filled

---

## Quick Smoke Test (Minimal)

Run these 5 tests after any service change:

1. **POST /api/auth/register/client** → 201 Created
2. **POST /api/auth/login** → 200 OK with tokens
3. **GET /api/lawyers/profile** → 200 OK with completion
4. **PATCH /api/clients/profile** → 200 OK
5. **GET /api/cases** → 200 OK with suggested lawyers

If all pass, services are likely stable.
