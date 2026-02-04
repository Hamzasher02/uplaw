import { StatusCodes } from "http-status-codes";
import CustomError from "./custom.error.js";

/**
 * Unauthenticated Error (401)
 * Use when user is not logged in or token is invalid
 */
class UnAuthenticated extends CustomError {
    constructor(message = 'Authentication required') {
        super(message, StatusCodes.UNAUTHORIZED, 'UNAUTHENTICATED');
    }
}

export default UnAuthenticated;