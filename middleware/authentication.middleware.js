import { UNAUTHENTICATED } from "../error/error.js";
import RefreshToken from "../model/refreshtoken.model.js";
import { attachCookie, verifyJWT, createJWT } from "../utils/cookies.utils.js";

/**
 * Authentication Middleware - Supports dual mode:
 * 1. Bearer token (app mode) - Authorization header
 * 2. HttpOnly cookies (web mode) - Signed cookies
 */
/**
 * Authentication Middleware - ENFORCED 401 STRATEGY
 * 1. Primary: Authorization: Bearer <accessToken> (App & Web)
 */
async function authenticationMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UNAUTHENTICATED("Authentication required. Please provide a valid Bearer token.");
        }

        const token = authHeader.split(' ')[1];

        try {
            // Verify Access Token
            const payload = verifyJWT({ token });
            req.user = payload;
            return next();
        } catch (error) {
            // IF TOKEN IS EXPIRED OR INVALID => THROW 401
            // This forces the client (Mobile/Web) to hit the /refresh-token endpoint
            if (error.name === 'TokenExpiredError') {
                throw new UNAUTHENTICATED("Access token expired");
            }
            throw new UNAUTHENTICATED("Invalid access token");
        }

    } catch (err) {
        next(err);
    }
}

export default authenticationMiddleware;
