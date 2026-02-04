import { StatusCodes } from "http-status-codes";
import CustomError from "./custom.error.js";

/**
 * Not Found Error (404)
 * Use when resource is not found
 */
class NotFound extends CustomError {
    constructor(message = 'Resource not found') {
        super(message, StatusCodes.NOT_FOUND, 'NOT_FOUND');
    }
}

export default NotFound;