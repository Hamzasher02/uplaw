import { UNAUTHENTICATED } from "../error/error.js";
import jwt from 'jsonwebtoken'
function socketAuthentication(err, socket, next) {
    if (err) return next(new UNAUTHENTICATED(err));
    const token = socket?.request?.signedCookies?.accessToken
    if (!token) return next(new UNAUTHENTICATED('No token found please login'));
    try {
        const { email, userId, role } = jwt.verify(token, process.env.JWT_SECRET)
        socket.user = {
            email, userId, role
        }
        next()
    } catch (err) {
        next(new UNAUTHENTICATED("Invailed token please login again"))
    }
}

export default socketAuthentication

