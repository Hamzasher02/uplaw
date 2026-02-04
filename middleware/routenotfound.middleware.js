import { StatusCodes } from 'http-status-codes';

/**
 * Route Not Found Middleware
 * Returns array format: [{ success, message, data }]
 */
const routeNotFoundMiddleware = (req, res) => {
    res.status(StatusCodes.NOT_FOUND).json([{
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        data: null
    }]);
};

export default routeNotFoundMiddleware;