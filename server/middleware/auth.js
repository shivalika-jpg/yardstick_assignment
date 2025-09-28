import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';

// Verify JWT token and extract user information
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'MISSING_TOKEN' 
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user and populate tenant information
    const user = await User.findById(decoded.userId)
      .populate('tenantId')
      .select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid or inactive user',
        code: 'INVALID_USER' 
      });
    }

    // Attach user and tenant info to request
    req.user = user;
    req.tenant = user.tenantId;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid access token',
        code: 'INVALID_TOKEN' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Access token expired',
        code: 'EXPIRED_TOKEN' 
      });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR' 
    });
  }
};

// Verify tenant access (additional security layer)
export const verifyTenantAccess = (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // If slug is provided in route, verify it matches user's tenant
    if (slug && req.tenant.slug !== slug) {
      return res.status(403).json({ 
        error: 'Access denied to this tenant',
        code: 'TENANT_ACCESS_DENIED' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Tenant verification error:', error);
    res.status(500).json({ 
      error: 'Tenant verification failed',
      code: 'TENANT_ERROR' 
    });
  }
};

// Require admin role
export const requireAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      code: 'AUTH_ERROR' 
    });
  }
};

// Require member or admin role (any authenticated user)
export const requireMember = (req, res, next) => {
  try {
    if (!req.user || !['admin', 'member'].includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Member access required',
        code: 'MEMBER_REQUIRED' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Member verification error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      code: 'AUTH_ERROR' 
    });
  }
};

// Generate JWT token
export const generateToken = (userId, expiresIn = '24h') => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

// Optional middleware to extract user without requiring authentication
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .populate('tenantId')
        .select('-password');

      if (user && user.isActive) {
        req.user = user;
        req.tenant = user.tenantId;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};