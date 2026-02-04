import { StatusCodes } from "http-status-codes";
import CustomError from "./custom.error.js";

/**
 * Bad Request Error (400)
 * Use for validation errors, invalid input, etc.
 */
class BadRequest extends CustomError {
    constructor(message = 'Bad request') {
        super(message, StatusCodes.BAD_REQUEST, 'BAD_REQUEST');
    }
}

export default BadRequest;