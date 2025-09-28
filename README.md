# Multi-Tenant SaaS Notes Application

A fully-featured multi-tenant SaaS Notes application built with the MERN stack, featuring role-based access control, subscription management, and tenant isolation.

## Features

- **Multi-Tenancy**: Secure tenant isolation using shared schema approach with tenant ID
- **Authentication**: JWT-based authentication with role-based access control
- **Subscription Management**: Free (3 notes limit) and Pro (unlimited notes) plans
- **Role-Based Access**: Admin and Member roles with appropriate permissions
- **Notes Management**: Full CRUD operations for notes with tagging and metadata
- **Real-time Limits**: Dynamic subscription limit enforcement
- **Responsive UI**: Clean, modern interface using specified color scheme

## Color Scheme

- **Primary Dark**: `#222831` - Main backgrounds and text
- **Secondary Dark**: `#393E46` - Secondary elements
- **Tertiary**: `#948979` - Accent elements
- **Primary Light**: `#DFD0B8` - Light backgrounds and highlights

## Architecture

### Multi-Tenancy Approach: Shared Schema with Tenant ID

**Why this approach?**
- **Cost-effective**: Single database instance for all tenants
- **Maintainable**: Single schema to maintain and update
- **Scalable**: Easy to add new tenants without infrastructure changes
- **Secure**: Proper isolation through application-level controls

### Database Schema

#### Tenants Collection
```javascript
{
  _id: ObjectId,
  slug: String (unique),
  name: String,
  subscription: {
    plan: 'free' | 'pro',
    noteLimit: Number,
    createdAt: Date,
    upgradedAt: Date
  },
  settings: Map,
  createdAt: Date,
  updatedAt: Date
}
```

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: 'admin' | 'member',
  tenantId: ObjectId (ref: Tenant),
  profile: {
    firstName: String,
    lastName: String,
    avatar: String
  },
  isActive: Boolean,
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Notes Collection
```javascript
{
  _id: ObjectId,
  title: String,
  content: String,
  tenantId: ObjectId (ref: Tenant),
  userId: ObjectId (ref: User),
  tags: [String],
  isPinned: Boolean,
  color: String,
  isArchived: Boolean,
  metadata: {
    wordCount: Number,
    readingTime: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd notes-saas
   ```

2. **Setup Backend**
   ```bash
   cd server
   npm install
   
   # Copy environment file and configure
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   
   # Seed the database with test accounts
   npm run seed
   
   # Start the server
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../client
   npm install
   
   # Start the frontend
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

## 👤 Test Accounts

All test accounts use the password: `password`

| Email | Role | Tenant | Description |
|-------|------|--------|-------------|
| admin@acme.test | admin | Acme | Can invite users and upgrade subscription |
| user@acme.test | member | Acme | Can only create, view, edit, and delete notes |
| admin@globex.test | admin | Globex | Can invite users and upgrade subscription |
| user@globex.test | member | Globex | Can only create, view, edit, and delete notes |

## 🛡 API Endpoints

### Health Check
- `GET /health` - Service health status

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/invite` - Invite user (Admin only)
- `GET /api/auth/users` - Get tenant users (Admin only)

### Notes
- `POST /api/notes` - Create a note
- `GET /api/notes` - List all notes for current tenant
- `GET /api/notes/:id` - Retrieve a specific note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note
- `GET /api/notes/stats` - Get note statistics

### Tenants
- `GET /api/tenants/current` - Get current tenant info
- `GET /api/tenants/subscription` - Get subscription status
- `POST /api/tenants/:slug/upgrade` - Upgrade subscription (Admin only)

## Security Features

### Tenant Isolation
- All queries automatically filtered by tenant ID
- User access restricted to their own tenant's data
- Cross-tenant data access prevention at application level

### Authentication & Authorization
- JWT-based authentication with secure token generation
- Role-based access control (Admin/Member)
- Token expiration and refresh handling
- Password hashing with bcrypt (salt rounds: 12)

### API Security
- Rate limiting on all endpoints
- Input sanitization and validation
- CORS configuration for production
- Helmet.js security headers
- Error message sanitization

## Subscription System

### Free Plan
- Limited to 3 notes per tenant
- All standard note features
- Admin can upgrade to Pro

### Pro Plan
- Unlimited notes
- All premium features
- Instant activation after upgrade

### Upgrade Process
1. Admin clicks "Upgrade to Pro" button
2. POST request to `/api/tenants/:slug/upgrade`
3. Subscription immediately updated
4. Note limit lifted instantly
5. UI reflects new status

##  Deployment

### Backend Deployment (Vercel)

1. **Prepare for deployment**
   ```bash
   cd server
   # Ensure vercel.json is configured
   ```

2. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard:**
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Strong JWT secret key
   - `NODE_ENV=production`
   - `FRONTEND_URL` - Your frontend URL

### Frontend Deployment (Vercel)

1. **Prepare for deployment**
   ```bash
   cd client
   # Update .env.production with backend URL
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Set environment variables:**
   - `REACT_APP_API_URL` - Your backend API URL

### MongoDB Setup

For production, use MongoDB Atlas:

1. Create a MongoDB Atlas cluster
2. Create a database user
3. Configure network access (allow Vercel IPs or 0.0.0.0/0)
4. Get the connection string
5. Update `MONGODB_URI` in your environment variables

## Testing

### Manual Testing Checklist

**Health Endpoint**
- [ ] `/health` returns `{"status": "ok"}`

 **Authentication**
- [ ] All test accounts can login successfully
- [ ] Invalid credentials are rejected
- [ ] JWT tokens are generated and validated

 **Tenant Isolation**
- [ ] Users can only see their tenant's notes
- [ ] Cross-tenant access attempts are blocked
- [ ] Admin actions are restricted to their tenant

 **Role-Based Access**
- [ ] Members cannot invite users
- [ ] Members cannot upgrade subscriptions
- [ ] Admins have full access within their tenant

 **Subscription Limits**
- [ ] Free plan enforces 3-note limit
- [ ] Note creation blocked when limit reached
- [ ] Pro upgrade removes limits immediately

 **CRUD Operations**
- [ ] Create notes with validation
- [ ] Read notes with pagination
- [ ] Update notes with proper authorization
- [ ] Delete notes with confirmation

##  Development

### Project Structure
```
notes-saas/
├── server/                 # Backend API
│   ├── config/            # Database configuration
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Authentication & validation
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── scripts/          # Database seeding
│   └── index.js          # Server entry point
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API service layer
│   │   ├── types/        # TypeScript definitions
│   │   └── App.tsx       # Main application
│   └── public/           # Static assets
└── README.md
```

### Environment Variables

#### Backend (.env)
```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/notes-saas
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:5000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues:

1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Ensure MongoDB connection is working
4. Check that all dependencies are installed

## 🎯 Key Implementation Highlights

### 1. **Tenant Isolation Strategy**
   - Shared schema with tenant ID column for cost-effectiveness
   - Application-level data isolation ensures security
   - Automatic tenant filtering in all database queries

### 2. **Subscription Management**
   - Real-time limit enforcement
   - Instant upgrades without restart
   - Clear UI feedback for limit status

### 3. **Security Implementation**
   - JWT authentication with proper error handling
   - Role-based middleware for route protection
   - Input validation and sanitization

### 4. **User Experience**
   - Responsive design with specified color scheme
   - Intuitive upgrade workflow
   - Clear feedback for all actions

### 5. **Production Ready**
   - Vercel deployment configuration
   - Environment-based configuration
   - Error handling and logging

This application demonstrates a complete multi-tenant SaaS architecture with proper security, scalability, and user experience considerations.
