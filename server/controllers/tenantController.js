import Tenant from '../models/Tenant.js';
import Note from '../models/Note.js';

// Get tenant information
export const getTenantInfo = async (req, res) => {
  try {
    const tenant = req.tenant;
    const noteCount = await Note.countByTenant(tenant._id);

    res.json({
      tenant: {
        id: tenant._id,
        slug: tenant.slug,
        name: tenant.name,
        subscription: {
          ...tenant.subscription.toObject(),
          currentNoteCount: noteCount,
          canCreateMore: await tenant.canCreateNote(noteCount)
        },
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt
      }
    });

  } catch (error) {
    console.error('Get tenant info error:', error);
    res.status(500).json({
      error: 'Failed to get tenant information',
      code: 'GET_TENANT_ERROR'
    });
  }
};

// Upgrade tenant subscription (Admin only)
export const upgradeSubscription = async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = req.tenant;

    // Verify slug matches current tenant
    if (tenant.slug !== slug) {
      return res.status(403).json({
        error: 'Access denied to this tenant',
        code: 'TENANT_ACCESS_DENIED'
      });
    }

    // Check if already on pro plan
    if (tenant.subscription.plan === 'pro') {
      return res.status(400).json({
        error: 'Tenant is already on Pro plan',
        code: 'ALREADY_PRO_PLAN'
      });
    }

    // Upgrade the subscription
    await tenant.upgradeSubscription();

    // Get updated note count
    const noteCount = await Note.countByTenant(tenant._id);

    res.json({
      message: 'Subscription upgraded to Pro successfully',
      tenant: {
        id: tenant._id,
        slug: tenant.slug,
        name: tenant.name,
        subscription: {
          ...tenant.subscription.toObject(),
          currentNoteCount: noteCount,
          canCreateMore: true // Pro plan has unlimited notes
        }
      }
    });

  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      error: 'Failed to upgrade subscription',
      code: 'UPGRADE_ERROR'
    });
  }
};

// Get subscription status and limits
export const getSubscriptionStatus = async (req, res) => {
  try {
    const tenant = req.tenant;
    const noteCount = await Note.countByTenant(tenant._id);
    const canCreateMore = await tenant.canCreateNote(noteCount);

    res.json({
      subscription: {
        plan: tenant.subscription.plan,
        noteLimit: tenant.subscription.noteLimit,
        currentNoteCount: noteCount,
        canCreateMore,
        createdAt: tenant.subscription.createdAt,
        upgradedAt: tenant.subscription.upgradedAt,
        isUnlimited: tenant.subscription.plan === 'pro'
      },
      limits: {
        notesRemaining: tenant.subscription.plan === 'free' 
          ? Math.max(0, tenant.subscription.noteLimit - noteCount)
          : -1, // -1 means unlimited
        percentageUsed: tenant.subscription.plan === 'free'
          ? Math.round((noteCount / tenant.subscription.noteLimit) * 100)
          : 0
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      error: 'Failed to get subscription status',
      code: 'SUBSCRIPTION_STATUS_ERROR'
    });
  }
};

// Update tenant settings (Admin only)
export const updateTenantSettings = async (req, res) => {
  try {
    const tenant = req.tenant;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Settings object is required',
        code: 'MISSING_SETTINGS'
      });
    }

    // Update settings
    Object.keys(settings).forEach(key => {
      if (typeof settings[key] === 'string') {
        tenant.settings.set(key, settings[key]);
      }
    });

    await tenant.save();

    res.json({
      message: 'Tenant settings updated successfully',
      settings: Object.fromEntries(tenant.settings)
    });

  } catch (error) {
    console.error('Update tenant settings error:', error);
    res.status(500).json({
      error: 'Failed to update tenant settings',
      code: 'UPDATE_SETTINGS_ERROR'
    });
  }
};

// Get all tenants (System admin only - for debugging/monitoring)
export const getAllTenants = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const tenants = await Tenant.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get note counts for each tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const noteCount = await Note.countByTenant(tenant._id);
        return {
          id: tenant._id,
          slug: tenant.slug,
          name: tenant.name,
          subscription: tenant.subscription,
          noteCount,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt
        };
      })
    );

    const total = await Tenant.countDocuments();

    res.json({
      tenants: tenantsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all tenants error:', error);
    res.status(500).json({
      error: 'Failed to get tenants',
      code: 'GET_TENANTS_ERROR'
    });
  }
};