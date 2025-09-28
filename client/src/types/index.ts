export interface User {
  id: string;
  email: string;
  role: 'admin' | 'member';
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  tenant: Tenant;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  subscription: Subscription;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  plan: 'free' | 'pro';
  noteLimit: number;
  currentNoteCount?: number;
  canCreateMore?: boolean;
  createdAt: string;
  upgradedAt?: string;
  isUnlimited?: boolean;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  tenantId: string;
  userId: {
    _id: string;
    email: string;
    profile: {
      firstName?: string;
      lastName?: string;
    };
  };
  tags: string[];
  isPinned: boolean;
  color: string;
  isArchived: boolean;
  metadata: {
    wordCount: number;
    readingTime: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
  color?: string;
  isPinned?: boolean;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
  color?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface NotesResponse {
  notes: Note[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  subscription: {
    plan: string;
    noteLimit: number;
    currentCount: number;
    canCreateMore: boolean;
  };
}

export interface ApiError {
  error: string;
  code: string;
  details?: string[];
  field?: string;
}

export interface SubscriptionStatus {
  subscription: {
    plan: 'free' | 'pro';
    noteLimit: number;
    currentNoteCount: number;
    canCreateMore: boolean;
    createdAt: string;
    upgradedAt?: string;
    isUnlimited: boolean;
  };
  limits: {
    notesRemaining: number;
    percentageUsed: number;
  };
}