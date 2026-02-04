import ActivityLog from '../model/activitylog.model.js';

/**
 * Activity Logger Middleware
 * Logs user activities to the database
 * @param {string} action - Type of action (REGISTRATION, LOGIN, etc.)
 * @param {string} description - Description of the action
 */
const activityLogger = (action, description, moduleName) => {
    return async (req, res, next) => {
        try {
            // Store original end function
            const originalEnd = res.end;

            // Override end to capture response
            res.end = function (chunk, encoding) {
                res.end = originalEnd;

                // Log activity after response is sent
                const logData = {
                    action,
                    module: moduleName || req.baseUrl.split('/').pop()?.toUpperCase() || 'AUTH',
                    description,
                    performedBy: req.user?.userId || undefined,
                    performerRole: req.user?.role || undefined,
                    performerEmail: req.user?.email || undefined,
                    targetUser: req.body?.userId || req.user?.userId || undefined,
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    userAgent: req.headers['user-agent'],
                    endpoint: req.originalUrl,
                    method: req.method,
                    payload: {
                        // Exclude sensitive fields
                        after: Object.fromEntries(
                            Object.entries(req.body || {}).filter(
                                ([key]) => !['password', 'confirmPassword', 'newPassword', 'currentPassword', 'otp'].includes(key)
                            )
                        )
                    },
                    status: res.statusCode < 400 ? 'success' : 'failure'
                };

                // Don't await - fire and forget
                ActivityLog.create(logData).catch(err => {
                    console.error('Activity logging failed:', err.message);
                });

                return originalEnd.call(this, chunk, encoding);
            };

            next();
        } catch (error) {
            // Don't block request if logging fails
            console.error('Activity logger error:', error.message);
            next();
        }
    };
};

export default activityLogger;
