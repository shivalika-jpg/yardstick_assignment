import express from 'express';
import {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  getNoteStats
} from '../controllers/notesController.js';
import {
  authenticateToken,
  requireMember
} from '../middleware/auth.js';
import {
  validateRequired,
  sanitizeInput,
  generalLimiter,
  validateTenantResource
} from '../middleware/general.js';
import Note from '../models/Note.js';

const router = express.Router();

// All routes require authentication and member role
router.use(authenticateToken, requireMember);

// Create a new note
router.post('/',
  generalLimiter,
  sanitizeInput,
  validateRequired(['title', 'content']),
  createNote
);

// Get all notes for the tenant
router.get('/',
  generalLimiter,
  getNotes
);

// Get note statistics
router.get('/stats',
  generalLimiter,
  getNoteStats
);

// Get a specific note
router.get('/:id',
  generalLimiter,
  getNote
);

// Update a note
router.put('/:id',
  generalLimiter,
  sanitizeInput,
  updateNote
);

// Delete a note
router.delete('/:id',
  generalLimiter,
  deleteNote
);

export default router;