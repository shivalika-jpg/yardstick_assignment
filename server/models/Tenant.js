import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free'
    },
    noteLimit: {
      type: Number,
      default: 3
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    upgradedAt: {
      type: Date,
      default: null
    }
  },
  settings: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

// Index for fast tenant lookups
tenantSchema.index({ slug: 1 });

// Virtual for getting note count
tenantSchema.virtual('noteCount', {
  ref: 'Note',
  localField: '_id',
  foreignField: 'tenantId',
  count: true
});

// Method to upgrade subscription
tenantSchema.methods.upgradeSubscription = function() {
  this.subscription.plan = 'pro';
  this.subscription.noteLimit = -1; // -1 means unlimited
  this.subscription.upgradedAt = new Date();
  return this.save();
};

// Method to check if tenant can create more notes
tenantSchema.methods.canCreateNote = async function(currentNoteCount) {
  if (this.subscription.plan === 'pro') {
    return true;
  }
  return currentNoteCount < this.subscription.noteLimit;
};

export default mongoose.model('Tenant', tenantSchema);