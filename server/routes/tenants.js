import express from 'express';
import {
  getTenantInfo,
  upgradeSubscription,
  getSubscriptionStatus,
  updateTenantSettings
} from '../controllers/tenantController.js';
import {
  authenticateToken,
  requireAdmin,
  requireMember,
  verifyTenantAccess
} from '../middleware/auth.js';
import {
  sanitizeInput,
  strictLimiter,
  generalLimiter
} from '../middleware/general.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get current tenant info
router.get('/current',
  generalLimiter,
  requireMember,
  getTenantInfo
);

// Get subscription status
router.get('/subscription',
  generalLimiter,
  requireMember,
  getSubscriptionStatus
);

// Upgrade subscription (Admin only)
router.post('/:slug/upgrade',
  strictLimiter,
  requireAdmin,
  verifyTenantAccess,
  upgradeSubscription
);

// Update tenant settings (Admin only)
router.put('/settings',
  generalLimiter,
  requireAdmin,
  sanitizeInput,
  updateTenantSettings
);

export default router;