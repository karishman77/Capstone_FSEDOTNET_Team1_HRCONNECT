import { useState, useEffect } from 'react';
import { leaveService } from '../services/api';
import { CarryForwardResult, LeaveAnalytics, LeaveRequest } from '../types';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import Table from '../components/Table';
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiDownload,
  FiRefreshCw,
  FiFilter,
  FiCalendar
} from 'react-icons/fi';

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

  const getStatusBadgeVariant = (status: string): 'success' | 'danger' | 'warning' | 'default' => {
    const normalized = normalizeStatus(status).toLowerCase();
    if (normalized === 'approved') return 'success';
    if (normalized === 'rejected') return 'danger';
    if (normalized === 'cancelled') return 'default';
    return 'warning';
  };

  const leaveColumns = [
    {
      header: 'Employee',
      accessor: (row: LeaveRequest) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.employee?.user?.fullName || 'Employee'}
          </div>
          <div className="text-sm text-gray-500">
            {row.employee?.user?.email}
          </div>
        </div>
      ),
    },
    {
      header: 'Leave Type',
      accessor: (row: LeaveRequest) => row.leaveType,
    },
    {
      header: 'Duration',
      accessor: (row: LeaveRequest) => `${row.numberOfDays} days`,
    },
    {
      header: 'Start Date',
      accessor: (row: LeaveRequest) => new Date(row.startDate).toLocaleDateString(),
    },
    {
      header: 'End Date',
      accessor: (row: LeaveRequest) => new Date(row.endDate).toLocaleDateString(),
    },
    {
      header: 'Status',
      accessor: (row: LeaveRequest) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {normalizeStatus(row.status)}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: LeaveRequest) => (
        row.status === 'Pending' ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedLeave(row);
              setAdminComments('');
            }}
          >
            Review
          </Button>
        ) : null
      ),
    },
  ];

  const analyticsTableColumns = [
    { header: 'Leave Type', accessor: 'leaveType' as const },
    { header: 'Allocated', accessor: 'totalAllocatedDays' as const },
    { header: 'Used', accessor: 'usedDays' as const },
    { header: 'Remaining', accessor: 'remainingDays' as const },
    {
      header: 'Utilization',
      accessor: (row: any) => `${row.utilizationPercentage}%`,
    },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Approvals</h1>
            <p className="text-gray-600 mt-1">Review and manage employee leave requests</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              icon={FiDownload}
              onClick={handleExportExcel}
              loading={exporting}
            >
              {exporting ? 'Exporting...' : 'Export Excel'}
            </Button>
            <Button
              variant="outline"
              icon={FiRefreshCw}
              onClick={handleCarryForward}
              loading={carryingForward}
            >
              {carryingForward ? 'Applying...' : 'Carry-Forward'}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Carry Forward Result */}
        {carryForwardResult && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            Policy applied for {carryForwardResult.fromYear} to {carryForwardResult.toYear} with max {carryForwardResult.maxCarryForwardDays} days.
            Updated balances: {carryForwardResult.updatedBalances}
          </div>
        )}

        {/* Analytics */}
        {analytics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <StatCard
                title="Total Requests"
                value={analytics.totalRequests}
                icon={FiCalendar}
                color="blue"
              />
              <StatCard
                title="Pending"
                value={analytics.pendingRequests}
                icon={FiClock}
                color="orange"
              />
              <StatCard
                title="Approved"
                value={analytics.approvedRequests}
                icon={FiCheckCircle}
                color="green"
              />
              <StatCard
                title="Rejected"
                value={analytics.rejectedRequests}
                icon={FiXCircle}
                color="red"
              />
              <StatCard
                title="Cancelled"
                value={analytics.cancelledRequests}
                icon={FiXCircle}
                color="purple"
              />
            </div>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Analytics by Type</h3>
              <Table
                data={analytics.byLeaveType}
                columns={analyticsTableColumns}
                keyExtractor={(row) => row.leaveType}
                emptyMessage="No analytics data available"
              />
            </Card>
          </>
        )}

        {/* Filter and Leave Requests */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Leave Requests</h2>
            <div className="flex items-center space-x-2">
              <FiFilter className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <p className="text-gray-600 mt-4">Loading leave requests...</p>
            </div>
          ) : (
            <Table
              data={filteredLeaves}
              columns={leaveColumns}
              keyExtractor={(row) => row.id}
              emptyMessage="No leave requests found"
            />
          )}
        </Card>
      </div>

      {/* Review Modal */}
      {selectedLeave && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLeave(null)}
          title="Review Leave Request"
          size="lg"
          footer={
            <div className="flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setSelectedLeave(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={FiXCircle}
                onClick={() => handleReject(selectedLeave.id)}
              >
                Reject
              </Button>
              <Button
                variant="success"
                icon={FiCheckCircle}
                onClick={() => handleApprove(selectedLeave.id)}
              >
                Approve
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Employee</label>
                <p className="text-gray-900 font-medium">
                  {selectedLeave.employee?.user?.fullName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{selectedLeave.employee?.user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Leave Type</label>
                <p className="text-gray-900">{selectedLeave.leaveType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Duration</label>
                <p className="text-gray-900">{selectedLeave.numberOfDays} days</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Start Date</label>
                <p className="text-gray-900">
                  {new Date(selectedLeave.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">End Date</label>
                <p className="text-gray-900">
                  {new Date(selectedLeave.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Reason</label>
              <p className="text-gray-900 mt-1">{selectedLeave.reason}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Comments (Optional)
              </label>
              <textarea
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                placeholder="Enter your comments"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
