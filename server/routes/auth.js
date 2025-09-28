import express from 'express';
import {
  login,
  getProfile,
  updateProfile,
  changePassword,
  inviteUser,
  getTenantUsers
} from '../controllers/authController.js';
import {
  authenticateToken,
  requireAdmin,
  requireMember
} from '../middleware/auth.js';
import {
  validateRequired,
  sanitizeInput,
  authLimiter,
  generalLimiter
} from '../middleware/general.js';

const router = express.Router();

// Public routes
router.post('/login',
  authLimiter,
  sanitizeInput,
  validateRequired(['email', 'password']),
  login
);

// Protected routes
router.use(authenticateToken);

// User profile routes
router.get('/profile', requireMember, getProfile);
router.put('/profile',
  requireMember,
  sanitizeInput,
  updateProfile
);

router.post('/change-password',
  requireMember,
  sanitizeInput,
  validateRequired(['currentPassword', 'newPassword']),
  changePassword
);

// Admin only routes
router.post('/invite',
  requireAdmin,
  sanitizeInput,
  validateRequired(['email']),
  inviteUser
);

router.get('/users',
  requireAdmin,
  getTenantUsers
);

export default router;