import { ROLES, ROLE_PERMISSIONS } from '../utils/constants.js';
import { UNAUTHORIZED } from '../error/error.js';

/**
 * RBAC Middleware - Role-Based Access Control
 */

/**
 * Check if user has one of the required roles
 * @param  {...string} allowedRoles - Roles that can access the route
 */
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            throw new UNAUTHORIZED('Authentication required');
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            throw new UNAUTHORIZED('You do not have permission to access this resource');
        }

        next();
    };
}

/**
 * Check if user has one of the required permissions
 * @param  {...string} requiredPermissions - Permissions needed to access route
 */
export function requirePermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            throw new UNAUTHORIZED('Authentication required');
        }

        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole] || [];

        const hasPermission = requiredPermissions.some(
            permission => userPermissions.includes(permission)
        );

        if (!hasPermission) {
            throw new UNAUTHORIZED('You do not have permission to perform this action');
        }

        next();
    };
}

/**
 * Check if user has ALL required permissions
 * @param  {...string} requiredPermissions - All permissions needed
 */
export function requireAllPermissions(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            throw new UNAUTHORIZED('Authentication required');
        }

        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole] || [];

        const hasAllPermissions = requiredPermissions.every(
            permission => userPermissions.includes(permission)
        );

        if (!hasAllPermissions) {
            throw new UNAUTHORIZED('You do not have all required permissions');
        }

        next();
    };
}

/**
 * Owner or admin check - user can only access their own resources unless admin
 * @param {Function} getResourceOwner - Function that returns the owner ID from request
 */
export function requireOwnerOrAdmin(getResourceOwner) {
    return async (req, res, next) => {
        if (!req.user) {
            throw new UNAUTHORIZED('Authentication required');
        }

        // Admins can access everything
        if (req.user.role === ROLES.ADMIN) {
            return next();
        }

        // Get the resource owner ID
        const ownerId = await getResourceOwner(req);

        if (ownerId.toString() !== req.user.userId.toString()) {
            throw new UNAUTHORIZED('You can only access your own resources');
        }

        next();
    };
}
