import rateLimit from 'express-rate-limit';

// Rate limiting configurations
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for sensitive operations
  message: {
    error: 'Too many requests for this operation, please try again later.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
export const validateRequired = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of fields) {
      const value = req.body[field];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        fields: missingFields
      });
    }
    
    next();
  };
};

// Sanitize input middleware
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS attempts
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        // Trim whitespace
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) {
    sanitize(req.body);
  }
  
  next();
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      error: `${field} already exists`,
      code: 'DUPLICATE_ERROR',
      field
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'EXPIRED_TOKEN'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
};

// 404 handler
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
};

// Tenant isolation validation
export const validateTenantResource = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          error: 'Resource ID is required',
          code: 'MISSING_RESOURCE_ID'
        });
      }

      const resource = await resourceModel.findById(id);
      
      if (!resource) {
        return res.status(404).json({
          error: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Ensure the resource belongs to the user's tenant
      if (resource.tenantId.toString() !== req.tenant._id.toString()) {
        return res.status(403).json({
          error: 'Access denied to this resource',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource validation error:', error);
      res.status(500).json({
        error: 'Resource validation failed',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};