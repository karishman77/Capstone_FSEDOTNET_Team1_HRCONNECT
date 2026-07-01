import { useState, useEffect } from 'react';
import { leaveService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LeaveRequest, LeaveBalance } from '../types';
import './Leaves.css';

export default function Leaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'Casual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const leaveTypes = ['Sick', 'Casual', 'Personal', 'Earned', 'Unpaid'];

  const normalizeStatus = (status: string) =>
    status === 'ManagerApproved' ? 'Approved' : status;

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user?.isAdmin) {
        // Admin: load all leave requests
        const leavesRes = await leaveService.getAll();
        setLeaves(leavesRes.data);
        setBalances([]);
      } else {
        // Employee: load their own leave requests and balances
        const [leavesRes, balancesRes] = await Promise.all([
          leaveService.getMine(),
          leaveService.getMyBalances(),
        ]);
        setLeaves(leavesRes.data);
        setBalances(balancesRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.isAdmin]);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.startDate || !formData.endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date cannot be earlier than start date');
      return;
    }

    const requestedDays =
      Math.floor((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (!user?.isAdmin) {
      const selectedBalance = balances.find((b) => b.leaveType === formData.leaveType);
      if (selectedBalance && requestedDays > selectedBalance.remainingDays) {
        setError(`Insufficient ${formData.leaveType} leave balance. Remaining: ${selectedBalance.remainingDays} day(s), requested: ${requestedDays} day(s)`);
        return;
      }
    }

    try {
      await leaveService.create({
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });
      setSuccess('Leave request created successfully');
      setFormData({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
      setShowCreateForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create leave request');
    }
  };

  const handleCancel = async (leaveId: string) => {
    if (window.confirm('Are you sure you want to cancel this leave request?')) {
      try {
        await leaveService.cancel(leaveId);
        setSuccess('Leave request cancelled');
        fetchData();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to cancel leave request');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (normalizeStatus(status).toLowerCase()) {
      case 'approved':
        return '#27ae60';
      case 'rejected':
        return '#e74c3c';
      case 'cancelled':
        return '#95a5a6';
      default:
        return '#f39c12';
    }
  };

  return (
    <div className="leaves-container">
      <h1>Leave Management</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {!user?.isAdmin && (
        <>
          <div className="balances-section">
            <h2>Leave Balances</h2>
            {loading ? (
              <p>Loading balances...</p>
            ) : balances.length === 0 ? (
              <p>No leave balance records found</p>
            ) : (
              <div className="balances-grid">
                {balances.map((balance) => (
                  <div key={balance.id} className="balance-card">
                    <h3>{balance.leaveType}</h3>
                    <p><strong>Total:</strong> {balance.totalDays} days</p>
                    <p><strong>Used:</strong> {balance.usedDays} days</p>
                    <p><strong>Remaining:</strong> {balance.remainingDays} days</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="create-leave-section">
            <button 
              className="btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : 'Request Leave'}
            </button>

            {showCreateForm && (
              <form onSubmit={handleCreateLeave} className="leave-form">
                <div className="form-group">
                  <label>Leave Type:</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  >
                    {leaveTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Start Date:</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date:</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Reason:</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Enter reason for leave"
                    rows={4}
                  />
                </div>

                <button type="submit" className="btn-success">Submit Request</button>
              </form>
            )}
          </div>
        </>
      )}

      <div className="leaves-section">
        <h2>{user?.isAdmin ? 'All Leave Requests' : 'My Leave Requests'}</h2>
        {loading ? (
          <p>Loading leave requests...</p>
        ) : leaves.length === 0 ? (
          <p>No leave requests found</p>
        ) : (
          <div className="leaves-grid">
            {leaves.map((leave) => (
              <div key={leave.id} className="leave-card">
                <div className="leave-header">
                  <h3>{leave.employee?.user?.fullName || 'Employee'}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(leave.status) }}
                  >
                    {normalizeStatus(leave.status)}
                  </span>
                </div>
                <p><strong>Type:</strong> {leave.leaveType}</p>
                <p><strong>Duration:</strong> {leave.numberOfDays} days</p>
                <p><strong>From:</strong> {new Date(leave.startDate).toLocaleDateString()}</p>
                <p><strong>To:</strong> {new Date(leave.endDate).toLocaleDateString()}</p>
                <p><strong>Reason:</strong> {leave.reason}</p>
                {leave.adminComments && (
                  <p><strong>Admin Comments:</strong> {leave.adminComments}</p>
                )}
                {!user?.isAdmin && leave.status === 'Pending' && (
                  <button 
                    className="btn-danger"
                    onClick={() => handleCancel(leave.id)}
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
