import axios, { AxiosResponse } from 'axios';
import {
  User,
  Note,
  LoginRequest,
  LoginResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
  NotesResponse,
  SubscriptionStatus,
  ApiError
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function to handle API errors
const handleApiError = (error: any): never => {
  if (error.response?.data) {
    throw error.response.data as ApiError;
  }
  throw {
    error: error.message || 'Network error',
    code: 'NETWORK_ERROR'
  } as ApiError;
};

// Auth API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const response: AxiosResponse<LoginResponse> = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getProfile: async (): Promise<{ user: User }> => {
    try {
      const response: AxiosResponse<{ user: User }> = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateProfile: async (profileData: any): Promise<{ message: string; user: User }> => {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  inviteUser: async (userData: { email: string; role?: string; profile?: any }): Promise<any> => {
    try {
      const response = await api.post('/auth/invite', userData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getTenantUsers: async (): Promise<any> => {
    try {
      const response = await api.get('/auth/users');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Notes API
export const notesApi = {
  getNotes: async (params?: {
    page?: number;
    limit?: number;
    sort?: string;
    archived?: boolean;
    pinned?: boolean;
    tags?: string;
  }): Promise<NotesResponse> => {
    try {
      const response: AxiosResponse<NotesResponse> = await api.get('/notes', { params });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getNote: async (id: string): Promise<{ note: Note }> => {
    try {
      const response: AxiosResponse<{ note: Note }> = await api.get(`/notes/${id}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  createNote: async (noteData: CreateNoteRequest): Promise<{ message: string; note: Note }> => {
    try {
      const response: AxiosResponse<{ message: string; note: Note }> = await api.post('/notes', noteData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateNote: async (id: string, noteData: UpdateNoteRequest): Promise<{ message: string; note: Note }> => {
    try {
      const response: AxiosResponse<{ message: string; note: Note }> = await api.put(`/notes/${id}`, noteData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteNote: async (id: string): Promise<{ message: string }> => {
    try {
      const response: AxiosResponse<{ message: string }> = await api.delete(`/notes/${id}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getNoteStats: async (): Promise<any> => {
    try {
      const response = await api.get('/notes/stats');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Tenant API
export const tenantApi = {
  getCurrentTenant: async (): Promise<any> => {
    try {
      const response = await api.get('/tenants/current');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => {
    try {
      const response: AxiosResponse<SubscriptionStatus> = await api.get('/tenants/subscription');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  upgradeSubscription: async (slug: string): Promise<any> => {
    try {
      const response = await api.post(`/tenants/${slug}/upgrade`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateSettings: async (settings: any): Promise<any> => {
    try {
      const response = await api.put('/tenants/settings', { settings });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Health check
export const healthApi = {
  check: async (): Promise<{ status: string; timestamp: string }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

export default api;
