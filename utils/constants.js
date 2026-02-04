/**
 * UPLAW Backend Constants
 * Centralized configuration for roles, permissions, and system-wide values
 */

// User Roles
export const ROLES = Object.freeze({
    ADMIN: 'admin',
    CLIENT: 'client',
    LAWYER: 'lawyer'
});

// Account Status
export const ACCOUNT_STATUS = Object.freeze({
    PENDING: 'pending',
    VERIFIED: 'verified',
    SUSPENDED: 'suspended',
    BLOCKED: 'blocked'
});

// OTP Configuration
export const OTP_CONFIG = Object.freeze({
    EXPIRY_MINUTES: 10,
    MAX_ATTEMPTS: 3,
    RESEND_COOLDOWN_SECONDS: 60,
    CODE_LENGTH: 6
});

// OTP Purpose
export const OTP_PURPOSE = Object.freeze({
    REGISTRATION: 'registration',
    PASSWORD_RESET: 'password_reset',
    EMAIL_CHANGE: 'email_change',
    PHONE_CHANGE: 'phone_change'
});

// OTP Type
export const OTP_TYPE = Object.freeze({
    EMAIL: 'email',
    PHONE: 'phone'
});

// Token Expiry
export const TOKEN_EXPIRY = Object.freeze({
    ACCESS_TOKEN_MINUTES: 15,
    REFRESH_TOKEN_HOURS: 48
});

// Lawyer Profile Steps
export const LAWYER_PROFILE_STEPS = Object.freeze({
    BASIC_INFO: 1,
    QUALIFICATIONS: 2,
    PRACTICE_AREAS: 3,
    AVAILABILITY: 4,
    DOCUMENTS: 5,
    TOTAL: 5
});

// Lawyer Profile Completion Percentage per Step
export const LAWYER_STEP_PERCENTAGE = Object.freeze({
    1: 20,  // Basic Info
    2: 40,  // Qualifications
    3: 60,  // Practice Areas
    4: 80,  // Availability
    5: 100  // Documents
});

// Availability Status
export const AVAILABILITY_STATUS = Object.freeze({
    AVAILABLE: 'available',
    ON_VACATION: 'on_vacation',
    UNAVAILABLE: 'unavailable'
});

// Gender Options
export const GENDER = Object.freeze({
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other'
});

// Languages
export const LANGUAGES = Object.freeze({
    ENGLISH: 'en',
    URDU: 'ur',
    PUNJABI: 'pa',
    SINDHI: 'sd',
    PASHTO: 'ps'
});

// Permissions (for RBAC)
export const PERMISSIONS = Object.freeze({
    // User permissions
    USERS_READ: 'users.read',
    USERS_WRITE: 'users.write',
    USERS_DELETE: 'users.delete',

    // Client permissions
    CLIENT_PROFILE_READ: 'client.profile.read',
    CLIENT_PROFILE_WRITE: 'client.profile.write',

    // Lawyer permissions
    LAWYER_PROFILE_READ: 'lawyer.profile.read',
    LAWYER_PROFILE_WRITE: 'lawyer.profile.write',

    // Admin permissions
    ADMIN_DASHBOARD: 'admin.dashboard',
    ADMIN_USERS_MANAGE: 'admin.users.manage',
    ADMIN_SETTINGS: 'admin.settings'
});

// Role-Permission Mapping
export const ROLE_PERMISSIONS = Object.freeze({
    [ROLES.ADMIN]: Object.values(PERMISSIONS),
    [ROLES.CLIENT]: [
        PERMISSIONS.CLIENT_PROFILE_READ,
        PERMISSIONS.CLIENT_PROFILE_WRITE
    ],
    [ROLES.LAWYER]: [
        PERMISSIONS.LAWYER_PROFILE_READ,
        PERMISSIONS.LAWYER_PROFILE_WRITE
    ]
});

// Activity Log Actions
export const LOG_ACTIONS = Object.freeze({
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    PASSWORD_RESET: 'PASSWORD_RESET',
    PROFILE_UPDATE: 'PROFILE_UPDATE',
    ACCOUNT_VERIFY: 'ACCOUNT_VERIFY',
    ACCOUNT_SUSPEND: 'ACCOUNT_SUSPEND',
    ACCOUNT_DELETE: 'ACCOUNT_DELETE',
    ACCOUNT_RESTORE: 'ACCOUNT_RESTORE'
});

// Activity Log Modules
export const LOG_MODULES = Object.freeze({
    AUTH: 'AUTH',
    CLIENT: 'CLIENT',
    LAWYER: 'LAWYER',
    ADMIN: 'ADMIN',
    SYSTEM: 'SYSTEM'
});

// Timeline Phase Keys (internal database keys)
export const PHASE_KEYS = Object.freeze({
    CASE_INTAKE: 'phase1CaseIntake',
    CASE_FILED: 'phase2CaseFiled',
    TRIAL_PREPARATION: 'phase3TrialPreparation',
    COURT_HEARING: 'phase4CourtHearing',
    CASE_OUTCOME: 'phase5Outcome'
});

// Phase Status
export const PHASE_STATUS = Object.freeze({
    PENDING: 'pending',
    ONGOING: 'ongoing',
    COMPLETED: 'completed'
});

// Outcome Types (for phase 5)
export const OUTCOME_TYPE = Object.freeze({
    WON: 'won',
    SETTLED: 'settled',
    DISMISSED: 'dismissed'
});

// Phase Key Slug to Internal Key Mapping (for API route params)
export const PHASE_SLUG_MAP = Object.freeze({
    'case-intake': PHASE_KEYS.CASE_INTAKE,
    'case-filed': PHASE_KEYS.CASE_FILED,
    'trial-preparation': PHASE_KEYS.TRIAL_PREPARATION,
    'court-hearing': PHASE_KEYS.COURT_HEARING,
    'case-outcome': PHASE_KEYS.CASE_OUTCOME
});

// Next Phase Mapping (for sequential unlock)
export const NEXT_PHASE_MAP = Object.freeze({
    [PHASE_KEYS.CASE_INTAKE]: PHASE_KEYS.CASE_FILED,
    [PHASE_KEYS.CASE_FILED]: PHASE_KEYS.TRIAL_PREPARATION,
    [PHASE_KEYS.TRIAL_PREPARATION]: PHASE_KEYS.COURT_HEARING,
    [PHASE_KEYS.COURT_HEARING]: PHASE_KEYS.CASE_OUTCOME,
    [PHASE_KEYS.CASE_OUTCOME]: null // Last phase
});
