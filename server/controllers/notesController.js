import Note from '../models/Note.js';
import Tenant from '../models/Tenant.js';

// Create a new note
export const createNote = async (req, res) => {
  try {
    const { title, content, tags, color, isPinned } = req.body;
    const user = req.user;
    const tenant = req.tenant;

    // Check subscription limits
    const noteCount = await Note.countByTenant(tenant._id);
    const canCreate = await tenant.canCreateNote(noteCount);

    if (!canCreate) {
      return res.status(403).json({
        error: `Note limit reached. Current plan allows ${tenant.subscription.noteLimit} notes.`,
        code: 'NOTE_LIMIT_REACHED',
        currentCount: noteCount,
        limit: tenant.subscription.noteLimit,
        subscription: tenant.subscription.plan
      });
    }

    const note = new Note({
      title,
      content,
      tenantId: tenant._id,
      userId: user._id,
      tags: tags || [],
      color: color || '#DFD0B8',
      isPinned: isPinned || false
    });

    await note.save();
    await note.populate('userId', 'email profile.firstName profile.lastName');

    res.status(201).json({
      message: 'Note created successfully',
      note
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      error: 'Failed to create note',
      code: 'CREATE_NOTE_ERROR'
    });
  }
};

// Get all notes for the tenant
export const getNotes = async (req, res) => {
  try {
    const tenant = req.tenant;
    const user = req.user;
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt',
      archived = false,
      pinned,
      userId: requestedUserId,
      tags
    } = req.query;

    // Build query options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      archived: archived === 'true'
    };

    // If user is not admin, they can only see their own notes
    if (user.role !== 'admin') {
      options.userId = user._id;
    } else if (requestedUserId) {
      options.userId = requestedUserId;
    }

    if (pinned !== undefined) {
      options.pinned = pinned === 'true';
    }

    let query = { tenantId: tenant._id, isArchived: options.archived };
    
    if (options.userId) {
      query.userId = options.userId;
    }
    
    if (options.pinned !== undefined) {
      query.isPinned = options.pinned;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    const skip = (options.page - 1) * options.limit;

    const notes = await Note.find(query)
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort(options.sort)
      .skip(skip)
      .limit(options.limit);

    const total = await Note.countDocuments(query);
    const totalActive = await Note.countByTenant(tenant._id);

    res.json({
      notes,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      },
      subscription: {
        plan: tenant.subscription.plan,
        noteLimit: tenant.subscription.noteLimit,
        currentCount: totalActive,
        canCreateMore: await tenant.canCreateNote(totalActive)
      }
    });

  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      error: 'Failed to get notes',
      code: 'GET_NOTES_ERROR'
    });
  }
};

// Get a specific note
export const getNote = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const tenant = req.tenant;

    const note = await Note.findOne({
      _id: id,
      tenantId: tenant._id
    }).populate('userId', 'email profile.firstName profile.lastName');

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Check if user can access this note
    if (!note.canAccess(user)) {
      return res.status(403).json({
        error: 'Access denied to this note',
        code: 'NOTE_ACCESS_DENIED'
      });
    }

    res.json({ note });

  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      error: 'Failed to get note',
      code: 'GET_NOTE_ERROR'
    });
  }
};

// Update a note
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, color, isPinned, isArchived } = req.body;
    const user = req.user;
    const tenant = req.tenant;

    const note = await Note.findOne({
      _id: id,
      tenantId: tenant._id
    });

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Check if user can access this note
    if (!note.canAccess(user)) {
      return res.status(403).json({
        error: 'Access denied to this note',
        code: 'NOTE_ACCESS_DENIED'
      });
    }

    // Update fields
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (tags !== undefined) note.tags = tags;
    if (color !== undefined) note.color = color;
    if (isPinned !== undefined) note.isPinned = isPinned;
    if (isArchived !== undefined) note.isArchived = isArchived;

    await note.save();
    await note.populate('userId', 'email profile.firstName profile.lastName');

    res.json({
      message: 'Note updated successfully',
      note
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      error: 'Failed to update note',
      code: 'UPDATE_NOTE_ERROR'
    });
  }
};

// Delete a note
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const tenant = req.tenant;

    const note = await Note.findOne({
      _id: id,
      tenantId: tenant._id
    });

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Check if user can access this note
    if (!note.canAccess(user)) {
      return res.status(403).json({
        error: 'Access denied to this note',
        code: 'NOTE_ACCESS_DENIED'
      });
    }

    await Note.findByIdAndDelete(id);

    res.json({
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      error: 'Failed to delete note',
      code: 'DELETE_NOTE_ERROR'
    });
  }
};

// Get note statistics
export const getNoteStats = async (req, res) => {
  try {
    const tenant = req.tenant;
    const user = req.user;

    // Build base query
    let baseQuery = { tenantId: tenant._id };
    
    // Non-admin users can only see their own stats
    if (user.role !== 'admin') {
      baseQuery.userId = user._id;
    }

    const [
      totalNotes,
      archivedNotes,
      pinnedNotes,
      totalWords,
      notesByUser
    ] = await Promise.all([
      Note.countDocuments({ ...baseQuery, isArchived: false }),
      Note.countDocuments({ ...baseQuery, isArchived: true }),
      Note.countDocuments({ ...baseQuery, isPinned: true, isArchived: false }),
      Note.aggregate([
        { $match: { ...baseQuery, isArchived: false } },
        { $group: { _id: null, totalWords: { $sum: '$metadata.wordCount' } } }
      ]),
      // Only show user breakdown for admins
      user.role === 'admin' ? Note.aggregate([
        { $match: { tenantId: tenant._id, isArchived: false } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { 
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            email: '$user.email',
            name: {
              $concat: [
                { $ifNull: ['$user.profile.firstName', ''] },
                ' ',
                { $ifNull: ['$user.profile.lastName', ''] }
              ]
            },
            count: 1
          }
        }
      ]) : []
    ]);

    res.json({
      stats: {
        totalNotes,
        archivedNotes,
        pinnedNotes,
        totalWords: totalWords[0]?.totalWords || 0,
        averageWordsPerNote: totalNotes > 0 ? Math.round((totalWords[0]?.totalWords || 0) / totalNotes) : 0,
        notesByUser: user.role === 'admin' ? notesByUser : undefined
      },
      subscription: {
        plan: tenant.subscription.plan,
        noteLimit: tenant.subscription.noteLimit,
        currentCount: totalNotes,
        canCreateMore: await tenant.canCreateNote(totalNotes)
      }
    });

  } catch (error) {
    console.error('Get note stats error:', error);
    res.status(500).json({
      error: 'Failed to get note statistics',
      code: 'GET_STATS_ERROR'
    });
  }
};