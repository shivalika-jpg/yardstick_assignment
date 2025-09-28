import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#DFD0B8',
    validate: {
      validator: function(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
      },
      message: 'Invalid color format. Use hex color codes.'
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  metadata: {
    wordCount: {
      type: Number,
      default: 0
    },
    readingTime: {
      type: Number, // in minutes
      default: 0
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
noteSchema.index({ tenantId: 1, userId: 1 });
noteSchema.index({ tenantId: 1, createdAt: -1 });
noteSchema.index({ tenantId: 1, isPinned: -1, createdAt: -1 });
noteSchema.index({ tenantId: 1, isArchived: 1 });

// Calculate word count and reading time before saving
noteSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const words = this.content.trim().split(/\s+/).filter(word => word.length > 0);
    this.metadata.wordCount = words.length;
    // Average reading speed: 200 words per minute
    this.metadata.readingTime = Math.ceil(words.length / 200);
  }
  next();
});

// Static method to count notes for a tenant
noteSchema.statics.countByTenant = function(tenantId) {
  return this.countDocuments({ tenantId, isArchived: false });
};

// Static method to get tenant notes with pagination
noteSchema.statics.findByTenant = function(tenantId, options = {}) {
  const {
    userId,
    page = 1,
    limit = 10,
    sort = '-createdAt',
    archived = false,
    pinned
  } = options;

  const query = { tenantId, isArchived: archived };
  
  if (userId) {
    query.userId = userId;
  }
  
  if (pinned !== undefined) {
    query.isPinned = pinned;
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .populate('userId', 'email profile.firstName profile.lastName')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Method to check if user can access this note
noteSchema.methods.canAccess = function(user) {
  return this.tenantId.toString() === user.tenantId.toString() && 
         (user.isAdmin() || this.userId.toString() === user._id.toString());
};

export default mongoose.model('Note', noteSchema);