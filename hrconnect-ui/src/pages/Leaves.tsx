import { useState, useEffect } from 'react';
import { leaveService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LeaveRequest, LeaveBalance } from '../types';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { FiCalendar, FiPlusCircle, FiX, FiClock, FiFileText } from 'react-icons/fi';

export default function Leaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
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
        const leavesRes = await leaveService.getAll();
        setLeaves(leavesRes.data);
        setBalances([]);
      } else {
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
      setShowCreateModal(false);
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

  const getStatusBadgeVariant = (status: string): 'success' | 'danger' | 'warning' | 'default' => {
    const normalized = normalizeStatus(status).toLowerCase();
    if (normalized === 'approved') return 'success';
    if (normalized === 'rejected') return 'danger';
    if (normalized === 'cancelled') return 'default';
    return 'warning';
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    return Math.floor((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-1">
              {user?.isAdmin ? 'View all employee leave requests' : 'Manage your leave requests and balances'}
            </p>
          </div>
          {!user?.isAdmin && (
            <Button
              variant="primary"
              icon={FiPlusCircle}
              onClick={() => setShowCreateModal(true)}
            >
              Request Leave
            </Button>
          )}
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

        {/* Leave Balances (Employee Only) */}
        {!user?.isAdmin && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave Balances</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : balances.length === 0 ? (
              <Card>
                <p className="text-gray-500 text-center py-8">No leave balance records found</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {balances.map((balance) => (
                  <Card key={balance.id} hover className="bg-gradient-to-br from-white to-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{balance.leaveType}</h3>
                      <FiCalendar className="w-5 h-5 text-primary-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total</span>
                        <span className="font-medium text-gray-900">{balance.totalDays} days</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Used</span>
                        <span className="font-medium text-red-600">{balance.usedDays} days</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Remaining</span>
                        <span className="font-bold text-green-600">{balance.remainingDays} days</span>
                      </div>
                    </div>
                    <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-secondary-500 h-full rounded-full transition-all"
                        style={{ width: `${(balance.remainingDays / balance.totalDays) * 100}%` }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leave Requests */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {user?.isAdmin ? 'All Leave Requests' : 'My Leave Requests'}
          </h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <p className="text-gray-600 mt-4">Loading leave requests...</p>
            </div>
          ) : leaves.length === 0 ? (
            <Card>
              <p className="text-gray-500 text-center py-12">No leave requests found</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaves.map((leave) => (
                <Card key={leave.id} hover>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {leave.employee?.user?.fullName || 'Employee'}
                      </h3>
                      <p className="text-sm text-gray-500">{leave.leaveType} Leave</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(leave.status)}>
                      {normalizeStatus(leave.status)}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <FiClock className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-auto font-medium text-gray-900">{leave.numberOfDays} days</span>
                    </div>

                    <div className="flex items-center text-sm">
                      <FiCalendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">From:</span>
                      <span className="ml-auto font-medium text-gray-900">
                        {new Date(leave.startDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center text-sm">
                      <FiCalendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">To:</span>
                      <span className="ml-auto font-medium text-gray-900">
                        {new Date(leave.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-start text-sm">
                        <FiFileText className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-gray-600 block mb-1">Reason:</span>
                          <p className="text-gray-900">{leave.reason}</p>
                        </div>
                      </div>
                    </div>

                    {leave.adminComments && (
                      <div className="pt-3 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
                        <p className="text-sm text-gray-600">Admin Comments:</p>
                        <p className="text-sm text-gray-900 mt-1">{leave.adminComments}</p>
                      </div>
                    )}

                    {!user?.isAdmin && leave.status === 'Pending' && (
                      <div className="pt-3 border-t border-gray-200">
                        <Button
                          variant="danger"
                          size="sm"
                          fullWidth
                          icon={FiX}
                          onClick={() => handleCancel(leave.id)}
                        >
                          Cancel Request
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Leave Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Request Leave"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateLeave}>
              Submit Request
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {leaveTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            icon={FiCalendar}
            required
          />

          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            icon={FiCalendar}
            required
          />

          {formData.startDate && formData.endDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Total Days:</strong> {calculateDays()} day(s)
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Enter reason for leave"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
