import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/general.js';

// Import routes
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import tenantRoutes from './routes/tenants.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Security and parsing middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://*.vercel.app',
    /^https:\/\/.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/tenants', tenantRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Notes SaaS API',
    version: '1.0.0',
    description: 'Multi-tenant SaaS Notes Application API',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      notes: '/api/notes',
      tenants: '/api/tenants'
    },
    documentation: {
      auth: {
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        invite: 'POST /api/auth/invite (Admin only)'
      },
      notes: {
        list: 'GET /api/notes',
        create: 'POST /api/notes',
        get: 'GET /api/notes/:id',
        update: 'PUT /api/notes/:id',
        delete: 'DELETE /api/notes/:id',
        stats: 'GET /api/notes/stats'
      },
      tenants: {
        info: 'GET /api/tenants/current',
        subscription: 'GET /api/tenants/subscription',
        upgrade: 'POST /api/tenants/:slug/upgrade (Admin only)'
      }
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;