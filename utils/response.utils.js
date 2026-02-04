import { StatusCodes } from 'http-status-codes';

/**
 * Response Helper Utilities
 * All responses return ARRAY format: [{ success, message, data }]
 */

/**
 * Send Success Response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 */
export const sendSuccess = (res, message, data = null, statusCode = StatusCodes.OK) => {
    res.status(statusCode).json([{
        success: true,
        message,
        data
    }]);
};

/**
 * Send Error Response  
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
export const sendError = (res, message, statusCode = StatusCodes.BAD_REQUEST) => {
    res.status(statusCode).json([{
        success: false,
        message,
        data: null
    }]);
};

/**
 * Send Created Response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Response data
 */
export const sendCreated = (res, message, data = null) => {
    res.status(StatusCodes.CREATED).json([{
        success: true,
        message,
        data
    }]);
};

/**
 * Send Paginated Response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Array} items - List items
 * @param {Object} meta - Pagination metadata
 */
export const sendPaginated = (res, message, items, meta) => {
    res.status(StatusCodes.OK).json([{
        success: true,
        message,
        data: {
            items,
            meta
        }
    }]);
};
