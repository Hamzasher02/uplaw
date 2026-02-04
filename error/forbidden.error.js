import { StatusCodes } from "http-status-codes";
import CustomError from "./custom.error.js";

/**
 * Forbidden Error (403)
 * Use when user is authenticated but doesn't have permission to access resource
 */
class Forbidden extends CustomError {
    constructor(message = 'Access forbidden') {
        super(message, StatusCodes.FORBIDDEN, 'FORBIDDEN');
    }
}

export default Forbidden;
