import jwt from 'jsonwebtoken';
import { TOKEN_EXPIRY } from './constants.js';

/**
 * Create a JWT token
 * @param {Object} payload - Data to encode in token
 * @param {string} expiresIn - Token expiry time (optional)
 */
export function createJWT({ payload, expiresIn }) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        ...(expiresIn && { expiresIn })
    });
}

/**
 * Verify a JWT token
 * @param {string} token - Token to verify
 */
export function verifyJWT({ token }) {
    return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Attach authentication cookies (web mode)
 * @param {string} refreshToken - Long-lived refresh token
 * @param {Response} res - Express response object
 */
export function attachCookie({ refreshToken, res }) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Create refresh token wrapper for cookie security (Industry standard: signed wrapper)
    const refreshTokenData = createJWT({ 
        payload: { refreshToken },
        expiresIn: '7d' 
    });
    
    // Set refresh token cookie (7 days)
    // HttpOnly: Prevents JS access (XSS protection)
    // Secure: Only sent over HTTPS
    // SameSite: Lax (Protects against CSRF while allowing navigation)
    res.cookie("refreshToken", refreshTokenData, { 
        maxAge: 7 * 24 * 60 * 60 * 1000, 
        secure: isProduction,
        httpOnly: true,
        signed: true,
        sameSite: 'lax'
    });
}

/**
 * Remove authentication cookies
 * @param {Response} res - Express response object
 */
export function removeCookie({ res }) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.clearCookie("accessToken", { 
        secure: isProduction,
        httpOnly: true,
        signed: true 
    });

    res.clearCookie("refreshToken", { 
        secure: isProduction,
        httpOnly: true,
        signed: true 
    });
}