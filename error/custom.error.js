import { StatusCodes } from "http-status-codes";

/**
 * Base Custom Error Class
 * All custom errors extend this class
 */
class CustomError extends Error {
    constructor(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errorCode = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Distinguishes operational errors from programming errors
        
        Error.captureStackTrace(this, this.constructor);
    }
}

export default CustomError;