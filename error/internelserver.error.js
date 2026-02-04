import { StatusCodes } from "http-status-codes";
import CustomError from "./custom.error.js";

/**
 * Internal Server Error (500)
 * Use for unexpected server errors
 */
class InternalServerError extends CustomError {
    constructor(message = 'Internal server error') {
        super(message, StatusCodes.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR');
    }
}

export default InternalServerError;