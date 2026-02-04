# UPLAW - Complete API Collection Guide

## Import Instructions

### Postman Collection
1. Open Postman
2. Click **Import** button
3. Select `uplaw-complete-api.postman_collection.json`
4. Collection will appear in left sidebar

### Postman Environment
1. Click **Environments** (gear icon)
2. Click **Import**
3. Select `uplaw-complete-api.postman_environment.json`
4. Select **UPLAW - Complete Environment** from dropdown

---

## Environment Variables Setup

Before running any requests, configure these variables in your environment:

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:5000` |
| `clientToken` | Client JWT token | *(auto-set after login)* |
| `lawyerToken` | Lawyer JWT token | *(auto-set after login)* |
| `otherClientToken` | Second client token for auth tests | *(manual)* |
| `otherLawyerToken` | Second lawyer token for auth tests | *(manual)* |
| `caseId` | Case ID | *(auto-set after case creation)* |
| `proposalId` | Proposal ID | *(auto-set after proposal creation)* |
| `invitationId` | Case invitation ID | *(auto-set)* |

---

## Execution Order (Recommended)

### 1. Authentication Flow
1. **Register Client** → Sets `clientToken`
2. **Register Lawyer** → Sets `lawyerToken`
3. **Verify OTP** (for both accounts)
4. **Login** (test existing accounts)

### 2. Profile Setup
5. **Get Client Profile**
6. **Update Client Profile**
7. **Get Lawyer Profile**
8. **Update Lawyer Profile** (multiple step endpoints available)

### 3. Case Management
9. **Create Case** (as client) → Sets `caseId`
10. **Get My Cases** (as client)
11. **Get Case by ID**
12. **Get Suggested Lawyers**
13. **Invite Lawyers** → Creates invitations

### 4. Lawyer Invitations
14. **Get Received Cases** (as lawyer)
15. **Respond to Invitation** (accept/decline)

### 5. Proposals
16. **Create Proposal** (as lawyer) → Sets `proposalId`
17. **Get Sent Proposals** (as lawyer)
18. **Get Received Proposals** (as client)
19. **Accept/Reject Proposal** (as client) → **Auto-creates timeline**

### 6. Case Timeline (Phases)

**Timeline is AUTO-CREATED when client accepts a proposal**

20. **Get Timeline** (client/lawyer)
21. **Submit Phase 1 - Case Intake** (lawyer)
22. **Submit Phase 2 - Case Filed** (lawyer)
23. **Submit Phase 3 - Trial Preparation** (lawyer)
24. **Add Court Hearing Subphase** (lawyer)
25. **Complete Court Hearing Phase** (lawyer)
26. **Submit Phase 5 - Case Outcome** (lawyer) → Marks case as completed

---

## Auto-Set IDs

The following requests **automatically capture and set** environment variables:

### Authentication
- **Register Client/Lawyer** → `clientToken` or `lawyerToken`
- **Login** → `clientToken` or `lawyerToken` (based on role)

### Cases
- **Create Case** → `caseId`
- **Get Received Cases** → `invitationId` (from first invitation)

### Proposals
- **Create Proposal** → `proposalId`

### Timeline
- **Accept Proposal** → Timeline auto-created (no ID needed)

---

## Multipart/Form-Data Requests

The following endpoints accept **file uploads** (use `form-data` in Postman):

### Authentication & Profiles
- `POST /api/v1/auth/register/client` - `profilePicture` (optional)
- `POST /api/v1/auth/register/lawyer` - `profilePicture` (optional)
- `PATCH /api/v1/client/profile` - `profilePicture`, `cnicDocument`
- `PATCH /api/v1/lawyer/profile` - `profilePhoto`, `cnicDocument`, `barLicenseDocument`, `degreeCertificate`

### Cases
- `POST /api/v1/cases` - `voiceNote` (optional)

### Timeline
- `POST /api/v1/cases/:caseId/phases/:phaseKey/submit` - `documents[]` (max 10 files)
- `POST /api/v1/cases/:caseId/phases/court-hearing/subphases` - `documents[]`

---

## Common Failure Reasons

### 401 Unauthorized
- Token missing or expired
- **Fix:** Re-login to get fresh token

### 403 Forbidden
- Trying to access resource you don't own
- Using wrong role (client vs lawyer)
- **Fix:** Use correct token for the role

### 400 Bad Request
- Missing required fields
- Invalid data format
- Validation errors
- **Fix:** Check request body matches examples

### 404 Not Found
- Invalid ID in URL
- Resource doesn't exist
- **Fix:** Verify `caseId`, `proposalId`, etc. are correct

---

## Response Format

All responses follow this **ARRAY** format:

### Success Response
```json
[{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}]
```

### Error Response
```json
[{
  "success": false,
  "message": "Error description",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}]
```

---

## Roles & Permissions

### Client-Only Endpoints
- Create case
- Get my cases
- Invite lawyers
- Update case status
- Respond to proposals (accept/reject)
- View timeline (own cases only)

### Lawyer-Only Endpoints
- Get received case invitations
- Respond to invitations
- Create proposals
- Withdraw proposals
- Submit timeline phases (assigned cases only)
- Add court hearing subphases

### Shared Endpoints
- Get case by ID (owner or invited lawyer)
- Get proposal by ID (owner only)
- Get timeline (case owner or assigned lawyer)

---

## Testing Workflow

### Setup (One-Time)
1. Register 2 clients
2. Register 2 lawyers
3. Verify all accounts via OTP

### Test Case Flow
1. Client creates case
2. Client invites lawyer
3. Lawyer views invitation
4. Lawyer accepts invitation
5. Lawyer creates proposal
6. Client views proposal
7. Client accepts proposal (**timeline auto-created**)
8. Lawyer submits phases 1-3
9. Lawyer adds court hearing subphase
10. Lawyer completes court hearing
11. Lawyer submits final outcome

### Authorization Tests
- Use `otherClientToken` to try accessing another client's case → Should fail (403)
- Use `otherLawyerToken` to try submitting phase for unassigned case → Should fail (403)

---

## Collection Statistics

**Total Endpoints:** 41

### By Module
- **Auth:** 13 endpoints
- **Client Profile:** 2 endpoints
- **Lawyer Profile:** 10 endpoints
- **Cases:** 10 endpoints
- **Proposals:** 6 endpoints
- **Timeline (Phases):** 4 endpoints

### By Method
- **GET:** 15
- **POST:** 15
- **PATCH:** 10
- **DELETE:** 1

---

## Notes

- **Base URL:** Default is `http://localhost:5000`, can be changed in environment
- **JWT Expiry:** Tokens may expire after 24h, re-login if you get 401
- **OTP:** Check console/logs for OTP codes (email service may not be configured)
- **File Uploads:** Max 10MB per file for documents
- **Timeline:** Auto-created on proposal acceptance, DO NOT try to create manually
- **Phase Sequence:** Must complete phases in order (1→2→3→4→5)

---

## Support

For issues:
1. Check environment variables are set correctly
2. Verify you're using the right token for the role
3. Check request body matches validator requirements
4. Review router files for exact endpoint paths
5. Check response error messages for details
