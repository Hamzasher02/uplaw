import multer from 'multer';
import { BAD_REQUEST } from '../error/error.js';

// Common multer configuration
const createMulter = (options = {}) => {
    return multer({
        dest: 'uploads/',
        limits: { fileSize: options.maxSize || 5 * 1024 * 1024 }, // Default 5MB
        fileFilter: options.fileFilter || undefined
    });
};

// Image file filter
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new BAD_REQUEST('Only image files (JPG, PNG, WEBP) are allowed'));
    }
};

// Document file filter (PDF, images)
const documentFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new BAD_REQUEST('Only PDF and image files are allowed'));
    }
};

// Profile Picture - 1MB limit, images only
export const singleProfilePicture = multer({
    dest: 'uploads/',
    limits: { fileSize: 1 * 1024 * 1024 },
    fileFilter: imageFilter
}).single('profilePicture');

// CNIC Document - 5MB limit, PDF and images
export const singleCNIC = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: documentFilter
}).single('cnicDocument');

// Certificate/Degree Document - 5MB limit
export const singleCertificate = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: documentFilter
}).single('certificate');

// Bar License Document - 5MB limit
export const singleBarLicense = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: documentFilter
}).single('barLicenseDocument');

// Transcript - 10MB limit
export const singleTranscript = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('transcript');

// Payment Screenshot - 5MB limit
export const singlePaymentScreenshot = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('paymentScreenshot');

// PDF files only - 10MB limit
export const singlePdfFile = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new BAD_REQUEST('Only PDF files are allowed'));
        }
    }
}).single('pdf');

// Video lecture - 750MB limit
export const uploadLectureVideo = multer({
    dest: 'uploads/',
    limits: { fileSize: 750 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/mkv', 'video/webm'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new BAD_REQUEST('Only video files (MP4, MKV, WEBM) are allowed'));
        }
    }
}).single('lecture');

// Multiple files upload (profile + transcript)
export const uploadTranscriptAndProfilePictrue = multer({
    dest: 'uploads/'
}).array('files', 2);

// Two files general
export const uploadTwoFiles = multer({
    dest: 'uploads/'
}).array('files', 2);

// Lawyer step 5 documents
export const uploadLawyerDocuments = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: documentFilter
}).fields([
    { name: 'cnicDocument', maxCount: 1 },
    { name: 'barLicenseDocument', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 }
]);

// Audio file filter for voice notes
const audioFilter = (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/x-m4a'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new BAD_REQUEST('Only audio files (MP3, WAV, OGG, M4A, WEBM) are allowed'));
    }
};

// Voice Note - 10MB limit, audio files only
export const singleVoiceNote = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: audioFilter
}).single('voiceNote');

// Case creation with voice note - supports text fields + voiceNote audio
export const uploadCaseFiles = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: audioFilter
}).single('voiceNote');

// Timeline Phase Documents - 10MB limit per file, max 10 files, PDF and images
const timelineDocumentFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new BAD_REQUEST('Only PDF and image files (JPG, PNG, WEBP) are allowed for timeline documents'));
    }
};

export const uploadTimelineDocuments = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024,  // 10MB per file
        files: 10  // Max 10 files
    },
    fileFilter: timelineDocumentFilter
}).array('documents', 10);

