import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authApi, notesApi, tenantApi } from './services/api';
import { User, Note, ApiError } from './types';
import './App.css';

// Simple Login Component
const Login: React.FC<{ onLogin: (user: User, token: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasExistingSession, setHasExistingSession] = useState(false);

  useEffect(() => {
    // Check if there's an existing session
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    setHasExistingSession(!!(token && user));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({ email, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      onLogin(response.user, response.token);
    } catch (err: any) {
      setError(err.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setHasExistingSession(false);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleReturnToDashboard = () => {
    // Try to restore session if valid
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        onLogin(user, token);
      } catch (err) {
        handleClearSession();
      }
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '400px', margin: '3rem auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Notes SaaS</h1>
        
        {/* Session Status */}
        {hasExistingSession && (
          <div className="card" style={{ backgroundColor: 'var(--primary-light)', marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem' }}>
                🔄 <strong>Existing Session Found</strong>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button 
                  type="button"
                  className="button button-primary"
                  onClick={handleReturnToDashboard}
                  style={{ fontSize: '14px' }}
                >
                  Continue Session
                </button>
                <button 
                  type="button"
                  className="button button-outline"
                  onClick={handleClearSession}
                  style={{ fontSize: '14px' }}
                >
                  🚪 Clear Session
                </button>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="input-group">
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div style={{ marginTop: '2rem', fontSize: '14px', color: 'var(--tertiary)' }}>
          <h3>Test Accounts:</h3>
          <p><strong>Acme Admin:</strong> admin@acme.test / password</p>
          <p><strong>Acme User:</strong> user@acme.test / password</p>
          <p><strong>Globex Admin:</strong> admin@globex.test / password</p>
          <p><strong>Globex User:</strong> user@globex.test / password</p>
        </div>
      </div>
    </div>
  );
};

// Simple Dashboard Component
const Dashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [creating, setCreating] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    loadNotes();
    loadSubscription();
    
    // Add keyboard shortcut for logout (Ctrl+Shift+L)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        setShowLogoutConfirm(true);
      }
      // ESC key to close modals
      if (event.key === 'Escape') {
        setShowCreateNote(false);
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const loadNotes = async () => {
    try {
      const response = await notesApi.getNotes();
      setNotes(response.notes);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    try {
      const response = await tenantApi.getSubscriptionStatus();
      setSubscription(response);
    } catch (err) {
      console.error('Failed to load subscription:', err);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await notesApi.createNote(newNote);
      setNewNote({ title: '', content: '' });
      setShowCreateNote(false);
      loadNotes();
      loadSubscription();
    } catch (err: any) {
      alert(err.error || 'Failed to create note');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await notesApi.deleteNote(id);
      loadNotes();
      loadSubscription();
    } catch (err: any) {
      alert(err.error || 'Failed to delete note');
    }
  };

  const handleUpgrade = async () => {
    try {
      await tenantApi.upgradeSubscription(user.tenant.slug);
      loadSubscription();
      alert('Subscription upgraded to Pro!');
    } catch (err: any) {
      alert(err.error || 'Failed to upgrade subscription');
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">Notes SaaS</div>
            <nav className="nav">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span>Welcome, <strong>{user.profile.firstName || user.email}</strong></span>
                <span style={{ fontSize: '0.9rem', opacity: '0.8' }}>({user.tenant.name} - {user.role.toUpperCase()})</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="button button-danger" onClick={handleLogoutClick}>
                  🚪 Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          {/* Subscription Status */}
          {subscription && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h2>Subscription Status</h2>
                <button 
                  className="button button-outline" 
                  onClick={handleLogoutClick}
                  style={{ fontSize: '12px', padding: '0.25rem 0.5rem' }}
                  title="Quick Logout"
                >
                  Logout
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p><strong>Plan:</strong> {subscription.subscription.plan.toUpperCase()}</p>
                  <p><strong>Notes:</strong> {subscription.subscription.currentNoteCount} / {subscription.subscription.isUnlimited ? '∞' : subscription.subscription.noteLimit}</p>
                  {subscription.subscription.plan === 'free' && (
                    <p><strong>Remaining:</strong> {subscription.limits.notesRemaining} notes</p>
                  )}
                </div>
                {subscription.subscription.plan === 'free' && user.role === 'admin' && (
                  <button className="button button-secondary" onClick={handleUpgrade}>
                    Upgrade to Pro
                  </button>
                )}
              </div>
              {subscription.subscription.plan === 'free' && !subscription.subscription.canCreateMore && (
                <div className="error-message">Note limit reached! {user.role === 'admin' ? 'Upgrade to Pro for unlimited notes.' : 'Contact your admin to upgrade.'}</div>
              )}
            </div>
          )}

          {/* Create Note Button */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Your Notes ({notes.length})</h2>
              {subscription?.subscription.canCreateMore && (
                <button 
                  className="button button-primary" 
                  onClick={() => setShowCreateNote(true)}
                >
                  Create Note
                </button>
              )}
            </div>
          </div>

          {/* Create Note Form */}
          {showCreateNote && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3 className="modal-title">Create New Note</h3>
                  <button className="close-button" onClick={() => setShowCreateNote(false)}>×</button>
                </div>
                <form onSubmit={handleCreateNote}>
                  <div className="input-group">
                    <label className="label">Title</label>
                    <input
                      type="text"
                      className="input"
                      value={newNote.title}
                      onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                      placeholder="Enter note title"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="label">Content</label>
                    <textarea
                      className="input textarea"
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      placeholder="Enter note content"
                      rows={6}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" className="button button-primary" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Note'}
                    </button>
                    <button 
                      type="button" 
                      className="button button-outline" 
                      onClick={() => setShowCreateNote(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Emergency Logout Button */}
          <button 
            className="emergency-logout" 
            onClick={handleLogoutClick}
            title="Emergency Logout (Ctrl+Shift+L)"
          >
            🚪
          </button>

          {/* Logout Confirmation Modal */}
          {showLogoutConfirm && (
            <div className="modal-overlay logout-modal">
              <div className="modal" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">🚪 Confirm Logout</h3>
                  <button className="close-button" onClick={cancelLogout}>×</button>
                </div>
                <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  <p style={{ marginBottom: '0.5rem' }}>Are you sure you want to logout?</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--tertiary)' }}>
                    You'll need to login again to access your notes.
                  </p>
                  <div className="keyboard-hint">Ctrl+Shift+L</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="button button-outline" 
                    onClick={cancelLogout}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="button button-danger" 
                    onClick={confirmLogout}
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes List */}
          {notes.length === 0 ? (
            <div className="card">
              <p style={{ textAlign: 'center', color: 'var(--tertiary)' }}>
                No notes yet. Create your first note!
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note._id} className={`note-card ${note.isPinned ? 'pinned' : ''}`}>
                <div className="note-header">
                  <h3 className="note-title">{note.title}</h3>
                  <div className="note-actions">
                    {note.isPinned && <span style={{ color: 'var(--warning)' }}>📌</span>}
                    <button 
                      className="button button-danger" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '12px' }}
                      onClick={() => handleDeleteNote(note._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="note-content">{note.content}</div>
                <div className="note-meta">
                  <div>
                    {note.tags.map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                  <div>
                    <small>By {note.userId.email} • {new Date(note.createdAt).toLocaleDateString()}</small>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/" 
            element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
