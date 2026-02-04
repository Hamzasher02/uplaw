# Service Pattern Standard

## Overview
All services in this project follow a consistent class-based pattern with singleton instances and named wrapper exports.

## Standard Pattern

### Structure
```javascript
// 1. Imports
import Model from '../model/model.js';
import { utility1, utility2 } from '../utils/helpers.js';

// 2. Helper functions (file-level, if needed)
const helperFunction = (data) => {
    // Helper logic
};

// 3. Service Class
class MyService {
    async myMethod(param1, param2) {
        // Business logic here
        // Use shared utilities (see below)
    }
}

// 4. Singleton Instance
const myService = new MyService();

// 5. Default Export (for backward compatibility)
export default myService;

// 6. Named Wrapper Exports (preferred for new code)
export const myMethod = (...args) => myService.myMethod(...args);
```

### Import Pattern (Controllers)

**✅ Preferred (Named Imports):**
```javascript
import {
    getProfileService,
    updateProfileService
} from '../services/myservice.services.js';
```

**⚠️ Legacy (Default Import):**
```javascript
import MyService from '../services/myservice.services.js';
// Only used in case.controller.js and proposal.controller.js for backward compatibility
```

## Response Envelope Standard

**CRITICAL:** All API responses use an **array wrapper** containing a single object.

### Standard Success Response
```javascript
res.status(200).json([{
    success: true,
    message: "Operation successful",
    data: { ... }  // Object or Array depending on endpoint
}]);
```

### Standard Error Response
```javascript
res.status(400).json([{
    success: false,
    message: "Error description",
    data: null
}]);
```

### Rules
1. ✅ **Always wrap in array:** `[{ success, message, data }]`
2. ✅ **Never return plain object:** `{ success, message, data }` ❌
3. ✅ **data can be object or array** depending on endpoint
4. ❌ **Do NOT change array wrapper to object** (Zero Behavior Change rule)

### Examples
```javascript
// Single item
[{ success: true, data: { user: {...} } }]

// List of items
[{ success: true, data: { cases: [...], count: 5 } }]

// No data
[{ success: true, data: [] }]
```

---

## Consistency Rules (Non-Negotiable)

These rules MUST be followed for all new code and refactoring:

1. **Response Envelope:** All controller responses MUST be: `res.json([{ success, message, data }])` — never plain object
2. **Controllers Stay Thin:** No DB queries, no business logic — only call services
3. **Use Shared Utilities:**
   - `parseJsonField()` for JSON string parsing (form-data arrays)
   - `handleFileUpload()` for all file uploads
   - `enrichWithLawyerProfile()` for lawyer data enrichment
   - `formatProfileResponse()` for user+profile merging
4. **No Duplicate Logic:** Reuse helpers/utilities across services — never copy-paste mapping/parsing
5. **Service Pattern Required:** Class + Singleton + Named Wrapper Exports
6. **Default Exports:** Keep only where legacy controllers use them (`case.controller.js`, `proposal.controller.js`) until migrated
7. **Zero Behavior Change:** Never modify API contracts, error messages, or status codes without approval
8. **Preserve Security Checks:** Ownership validation, invitation checks, role-based access must remain intact
9. **Array Validations:** Use existing validation logic (e.g., max 7 services for lawyers)
10. **Error Types:** Use standard errors (`NOT_FOUND`, `BAD_REQUEST`, `UNAUTHORIZED`) consistently

---

## Shared Utilities (No Duplicate Logic Rule)

### JSON Parsing
**Always use:** `parseJsonField` from `utils/query.helper.utils.js`
```javascript
import { parseJsonField } from '../utils/query.helper.utils.js';

// ✅ Correct
profile.areasOfPractice = parseJsonField(data.areasOfPractice, []);

// ❌ Wrong (duplicate logic)
profile.areasOfPractice = typeof data.areasOfPractice === 'string' 
    ? JSON.parse(data.areasOfPractice) 
    : data.areasOfPractice;
```

### File Uploads
**Always use:** `handleFileUpload` from `utils/profile.helper.utils.js`
```javascript
import { handleFileUpload } from '../utils/profile.helper.utils.js';
import { uploadToCloud, deleteFromCloud } from './cloudinary.uploader.services.js';

const result = await handleFileUpload({
    file: files.profilePhoto[0],
    existingDoc: user.profilePicture,
    uploadFn: uploadToCloud,
    deleteFn: deleteFromCloud
});
if (result) user.profilePicture = result;
```

### Profile Formatting
**Always use:** `formatProfileResponse` from `utils/profile.helper.utils.js`
```javascript
import { formatProfileResponse } from '../utils/profile.helper.utils.js';

// Merges user + profile, removes internal fields
return formatProfileResponse(user, profile);
```

### Profile Creation
**Always use:** `getOrCreateProfile` from `utils/profile.helper.utils.js`
```javascript
import { getOrCreateProfile } from '../utils/profile.helper.utils.js';

const profile = await getOrCreateProfile(LawyerProfile, userId);
```

### Lawyer Profile Enrichment
**Always use:** `enrichWithLawyerProfile` from `utils/query.helper.utils.js`
```javascript
import { enrichWithLawyerProfile } from '../utils/query.helper.utils.js';

const lawyerProfile = await enrichWithLawyerProfile(
    lawyerId, 
    'areasOfPractice yearsOfExperience city'
);
```

### Lawyer Mapping (Case Service)
**Always use:** `mapProfileToLawyer` method in CaseService
```javascript
// Inside CaseService class
const lawyers = matchingProfiles
    .filter(profile => profile.userId !== null)
    .map(profile => this.mapProfileToLawyer(profile, ['courtJurisdiction', 'languagesSpoken']));
```

## Services Overview

| Service | Class | Pattern | Notes |
|---------|-------|---------|-------|
| auth.services.js | AuthService | ✅ Standard | 9 methods, file-level helper |
| lawyer.services.js | LawyerService | ✅ Standard | 12 methods, file-level helper |
| client.services.js | ClientService | ✅ Standard | 2 methods |
| case.services.js | CaseService | ✅ Standard | 8 methods, class method helper |
| proposal.services.js | ProposalService | ✅ Standard | 6 methods |

## Rules for New Services

1. **Always use class-based pattern** with singleton instance
2. **Always provide named wrapper exports** for all public methods
3. **Never duplicate utility logic** - use shared utilities
4. **Keep helpers outside class** when possible (avoid `this` binding issues)
5. **Preserve backward compatibility** with default exports if needed
6. **Document one-time vs editable fields** in comments
7. **Use consistent error handling** (NOT_FOUND, BAD_REQUEST, UNAUTHORIZED)

## Example: Adding a New Service

```javascript
import Model from '../model/model.js';
import { handleFileUpload, formatProfileResponse } from '../utils/profile.helper.utils.js';
import { NOT_FOUND } from '../error/error.js';

class NewService {
    async getItem(id) {
        const item = await Model.findById(id);
        if (!item) throw new NOT_FOUND('Item not found');
        return item;
    }

    async updateItem(id, data) {
        const item = await Model.findById(id);
        if (!item) throw new NOT_FOUND('Item not found');
        
        // Update logic
        if (data.field !== undefined) item.field = data.field;
        
        await item.save();
        return item;
    }
}

const newService = new NewService();

export default newService;

export const getItem = (...args) => newService.getItem(...args);
export const updateItem = (...args) => newService.updateItem(...args);
```

## Migration Notes

All services were refactored in **Batch 6 (Service Pattern Standardization)**:
- Batch 6a: auth.services.js
- Batch 6b: lawyer.services.js
- Batch 6c: client.services.js
- Batch 6d: case.services.js + proposal.services.js

Total impact: ~300+ lines of duplicate code eliminated across 14 files.
