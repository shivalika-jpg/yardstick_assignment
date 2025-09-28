import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import { generateToken } from '../middleware/auth.js';

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and populate tenant
    const user = await User.findOne({ email })
      .populate('tenantId');

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account is inactive',
        code: 'INACTIVE_ACCOUNT'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    await user.updateLastLogin();

    // Return user info and token
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        tenant: {
          id: user.tenantId._id,
          slug: user.tenantId.slug,
          name: user.tenantId.name,
          subscription: user.tenantId.subscription
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('tenantId')
      .select('-password');

    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        tenant: {
          id: user.tenantId._id,
          slug: user.tenantId.slug,
          name: user.tenantId.name,
          subscription: user.tenantId.subscription
        },
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR'
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { profile } = req.body;
    const user = req.user;

    // Update profile fields
    if (profile) {
      if (profile.firstName !== undefined) {
        user.profile.firstName = profile.firstName;
      }
      if (profile.lastName !== undefined) {
        user.profile.lastName = profile.lastName;
      }
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR'
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
};

// Invite user (Admin only)
export const inviteUser = async (req, res) => {
  try {
    const { email, role = 'member', profile } = req.body;
    const adminUser = req.user;
    const tenant = req.tenant;

    // Check if user already exists in this tenant
    const existingUser = await User.findOne({ 
      email, 
      tenantId: tenant._id 
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists in this tenant',
        code: 'USER_ALREADY_EXISTS'
      });
    }

    // Create new user with default password
    const newUser = new User({
      email,
      password: 'password', // Default password as specified
      role,
      tenantId: tenant._id,
      profile: profile || {}
    });

    await newUser.save();

    res.status(201).json({
      message: 'User invited successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        profile: newUser.profile,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      error: 'Failed to invite user',
      code: 'INVITE_ERROR'
    });
  }
};

// Get tenant users (Admin only)
export const getTenantUsers = async (req, res) => {
  try {
    const tenant = req.tenant;
    const { page = 1, limit = 10, role } = req.query;

    const query = { tenantId: tenant._id };
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get tenant users error:', error);
    res.status(500).json({
      error: 'Failed to get tenant users',
      code: 'GET_USERS_ERROR'
    });
  }
};