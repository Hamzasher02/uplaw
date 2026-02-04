import { StatusCodes } from 'http-status-codes';
import cleanupUploadedFiles  from '../utils/cleanup.helper.utils.js';
/**
 * Error Code Mapping
 * Maps error types to user-friendly error codes
 */
const ERROR_CODES = {
    ValidationError: 'VALIDATION_ERROR',
    CastError: 'INVALID_ID',
    JsonWebTokenError: 'INVALID_TOKEN',
    TokenExpiredError: 'TOKEN_EXPIRED',
    MongoError: 'DATABASE_ERROR',
    MulterError: 'FILE_UPLOAD_ERROR'
};

/**
 * Custom Error Handler Middleware
 * Industry Standard Error Response Format
 * Returns: [{ success, message, data, error }]
 */
const customErrorHandler = (err, req, res, next) => {
    cleanupUploadedFiles(req);
    // Build error response object
    let errorResponse = {
        statusCode: err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR,
        message: err.message || 'Something went wrong',
        errorCode: err.errorCode || 'INTERNAL_ERROR',
        details: null
    };

    // =================== MONGOOSE ERRORS ===================
    
    // Validation Error (Schema validation failed)
    if (err.name === 'ValidationError') {
        const details = Object.values(err.errors).map(item => item.message);
        errorResponse = {
            statusCode: StatusCodes.BAD_REQUEST,
            message: details.join(', '),
            errorCode: 'VALIDATION_ERROR',
            details
        };
    }

    // Duplicate Key Error (Unique constraint violation)
    if (err.code && err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        errorResponse = {
            statusCode: StatusCodes.CONFLICT,
            message: `${field} '${value}' already exists`,
            errorCode: 'DUPLICATE_ERROR',
            details: { field, value }
        };
    }

    // Cast Error (Invalid MongoDB ID format)
    if (err.name === 'CastError') {
        errorResponse = {
            statusCode: StatusCodes.BAD_REQUEST,
            message: `Invalid ${err.path}: ${err.value}`,
            errorCode: 'INVALID_ID',
            details: { path: err.path, value: err.value }
        };
    }

    // =================== JWT ERRORS ===================
    
    if (err.name === 'JsonWebTokenError') {
        errorResponse = {
            statusCode: StatusCodes.UNAUTHORIZED,
            message: 'Invalid token. Please login again.',
            errorCode: 'INVALID_TOKEN',
            details: null
        };
    }

    if (err.name === 'TokenExpiredError') {
        errorResponse = {
            statusCode: StatusCodes.UNAUTHORIZED,
            message: 'Token expired. Please login again.',
            errorCode: 'TOKEN_EXPIRED',
            details: null
        };
    }

    // =================== FILE UPLOAD ERRORS ===================
    
    if (err.name === 'MulterError') {
        let message = 'File upload error';
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File size too large. Maximum allowed is 5MB.';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = `Unexpected file field: ${err.field}`;
        }
        errorResponse = {
            statusCode: StatusCodes.BAD_REQUEST,
            message,
            errorCode: 'FILE_UPLOAD_ERROR',
            details: { code: err.code, field: err.field }
        };
    }

    // =================== OPERATIONAL vs PROGRAMMING ERRORS ===================
    
    // For non-operational errors (programming bugs), log and send generic message
    if (!err.isOperational && errorResponse.statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
        console.error('=== UNEXPECTED ERROR ===');
        console.error('Time:', new Date().toISOString());
        console.error('Path:', req.path);
        console.error('Method:', req.method);
        console.error('Error:', err);
        console.error('Stack:', err.stack);
        console.error('========================');
        
        // In production, don't expose internal error details
        if (process.env.NODE_ENV === 'production') {
            errorResponse.message = 'An unexpected error occurred. Please try again later.';
            errorResponse.details = null;
        }
    }

    // Log all errors in development
    if (process.env.NODE_ENV === 'development') {
        console.error(`[${errorResponse.errorCode}] ${errorResponse.message}`);
    }

    // =================== SEND RESPONSE ===================
    
    res.status(errorResponse.statusCode).json([{
        success: false,
        message: errorResponse.message,
        data: null,
        error: {
            code: errorResponse.errorCode,
            statusCode: errorResponse.statusCode
        }
    }]);
};

export default customErrorHandler;