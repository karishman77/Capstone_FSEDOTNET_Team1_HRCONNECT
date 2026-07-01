import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile, isLoading } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    try {
      await updateProfile(fullName.trim());
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1>My Profile</h1>
        <p className="profile-subtitle">Manage your account details</p>

        {error && <div className="profile-error">{error}</div>}
        {success && <div className="profile-success">{success}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-field">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled />
          </div>

          <div className="profile-field">
            <label>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="profile-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>
              Back
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
