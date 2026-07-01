import { useState, useEffect } from 'react';
import { leaveService } from '../services/api';
import { CarryForwardResult, LeaveAnalytics, LeaveRequest } from '../types';
import './LeaveApprovals.css';

export default function LeaveApprovals() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [analytics, setAnalytics] = useState<LeaveAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [carryingForward, setCarryingForward] = useState(false);
  const [carryForwardResult, setCarryForwardResult] = useState<CarryForwardResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('Pending');
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [adminComments, setAdminComments] = useState('');

  const normalizeStatus = (status: string) =>
    status === 'ManagerApproved' ? 'Approved' : status;

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const [res, analyticsRes] = await Promise.all([
        leaveService.getAll(),
        leaveService.getAnalytics(),
      ]);
      setLeaves(res.data);
      setAnalytics(analyticsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApprove = async (leaveId: string) => {
    try {
      await leaveService.updateStatus(leaveId, {
        status: 'Approved',
        adminComments: adminComments,
      });
      setSuccess('Leave request approved');
      setSelectedLeave(null);
      setAdminComments('');
      fetchLeaves();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve leave request');
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      await leaveService.updateStatus(leaveId, {
        status: 'Rejected',
        adminComments: adminComments,
      });
      setSuccess('Leave request rejected');
      setSelectedLeave(null);
      setAdminComments('');
      fetchLeaves();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject leave request');
    }
  };

  const handleExportExcel = async () => {
    setError('');
    setSuccess('');
    setExporting(true);

    try {
      const response = await leaveService.exportExcel();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const disposition = response.headers['content-disposition'];
      const fallbackName = `leave-report-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      const fileNameMatch = disposition?.match(/filename="?([^";]+)"?/i);
      const fileName = fileNameMatch?.[1] || fallbackName;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setSuccess('Leave report exported successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export leave report');
    } finally {
      setExporting(false);
    }
  };

  const handleCarryForward = async () => {
    setError('');
    setSuccess('');
    setCarryingForward(true);

    try {
      const currentYear = new Date().getUTCFullYear();
      const res = await leaveService.applyCarryForward(currentYear - 1, currentYear, 5);
      setCarryForwardResult(res.data);
      setSuccess(`Carry-forward applied successfully. Updated balances: ${res.data.updatedBalances}`);
      fetchLeaves();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply carry-forward policy');
    } finally {
      setCarryingForward(false);
    }
  };

  const filteredLeaves = leaves.filter(
    (leave) => filter === 'All' || normalizeStatus(leave.status) === filter
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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
    <div className="approvals-container">
      <h1>Leave Approvals</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {analytics && (
        <div className="analytics-section">
          <h2>Leave Analytics</h2>
          <div className="analytics-cards">
            <div className="analytics-card"><strong>Total</strong><span>{analytics.totalRequests}</span></div>
            <div className="analytics-card"><strong>Pending</strong><span>{analytics.pendingRequests}</span></div>
            <div className="analytics-card"><strong>Approved</strong><span>{analytics.approvedRequests}</span></div>
            <div className="analytics-card"><strong>Rejected</strong><span>{analytics.rejectedRequests}</span></div>
            <div className="analytics-card"><strong>Cancelled</strong><span>{analytics.cancelledRequests}</span></div>
          </div>

          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Allocated</th>
                  <th>Used</th>
                  <th>Remaining</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {analytics.byLeaveType.map((item) => (
                  <tr key={item.leaveType}>
                    <td>{item.leaveType}</td>
                    <td>{item.totalAllocatedDays}</td>
                    <td>{item.usedDays}</td>
                    <td>{item.remainingDays}</td>
                    <td>{item.utilizationPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="filter-section">
        <label>Filter by Status:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button
          type="button"
          className="btn-export"
          onClick={handleExportExcel}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
        <button
          type="button"
          className="btn-carry-forward"
          onClick={handleCarryForward}
          disabled={carryingForward}
        >
          {carryingForward ? 'Applying...' : 'Apply Carry-Forward'}
        </button>
      </div>

      {carryForwardResult && (
        <div className="carry-forward-result">
          Policy applied for {carryForwardResult.fromYear} to {carryForwardResult.toYear} with max {carryForwardResult.maxCarryForwardDays} days.
          Updated balances: {carryForwardResult.updatedBalances}
        </div>
      )}

      {loading ? (
        <p>Loading leave requests...</p>
      ) : filteredLeaves.length === 0 ? (
        <p>No leave requests found</p>
      ) : (
        <div className="approvals-grid">
          {filteredLeaves.map((leave) => (
            <div 
              key={leave.id} 
              className={`approval-card ${normalizeStatus(leave.status).toLowerCase()}`}
            >
              <div className="card-header">
                <div>
                  <h3>{leave.employee?.user?.fullName || 'Employee'}</h3>
                  <p className="email">{leave.employee?.user?.email}</p>
                </div>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(normalizeStatus(leave.status)) }}
                >
                  {normalizeStatus(leave.status)}
                </span>
              </div>

              <div className="card-details">
                <p><strong>Leave Type:</strong> {leave.leaveType}</p>
                <p><strong>Duration:</strong> {leave.numberOfDays} days</p>
                <p><strong>Start Date:</strong> {new Date(leave.startDate).toLocaleDateString()}</p>
                <p><strong>End Date:</strong> {new Date(leave.endDate).toLocaleDateString()}</p>
                <p><strong>Reason:</strong> {leave.reason}</p>
                {leave.adminComments && (
                  <p><strong>Comments:</strong> {leave.adminComments}</p>
                )}
              </div>

              {leave.status === 'Pending' && (
                <button
                  className="btn-action"
                  onClick={() => {
                    setSelectedLeave(leave);
                    setAdminComments('');
                  }}
                >
                  Review
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedLeave && (
        <div className="modal-overlay" onClick={() => setSelectedLeave(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Leave Request</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedLeave(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p><strong>Employee:</strong> {selectedLeave.employee?.user?.fullName}</p>
              <p><strong>Email:</strong> {selectedLeave.employee?.user?.email}</p>
              <p><strong>Leave Type:</strong> {selectedLeave.leaveType}</p>
              <p><strong>Duration:</strong> {selectedLeave.numberOfDays} days</p>
              <p><strong>From:</strong> {new Date(selectedLeave.startDate).toLocaleDateString()}</p>
              <p><strong>To:</strong> {new Date(selectedLeave.endDate).toLocaleDateString()}</p>
              <p><strong>Reason:</strong> {selectedLeave.reason}</p>

              <div className="form-group">
                <label>Admin Comments:</label>
                <textarea
                  value={adminComments}
                  onChange={(e) => setAdminComments(e.target.value)}
                  placeholder="Enter your comments (optional)"
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn-approve"
                  onClick={() => handleApprove(selectedLeave.id)}
                >
                  Approve
                </button>
                <button
                  className="btn-reject"
                  onClick={() => handleReject(selectedLeave.id)}
                >
                  Reject
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => setSelectedLeave(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
