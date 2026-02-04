import { StatusCodes } from "http-status-codes";
import CustomError from "./custom.error.js";

/**
 * Unauthorized/Forbidden Error (403)
 * Use when user is authenticated but doesn't have permission
 */
class Unauthorized extends CustomError {
    constructor(message = 'Access forbidden') {
        super(message, StatusCodes.FORBIDDEN, 'FORBIDDEN');
    }
}

export default Unauthorized;