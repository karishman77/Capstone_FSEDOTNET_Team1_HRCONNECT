import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { employeeService } from '../services/api';
import { Employee } from '../types';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Table from '../components/Table';
import StatCard from '../components/StatCard';
import {
  FiUsers,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiCalendar,
  FiUser,
  FiMail,
  FiBriefcase,
  FiLayers
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: 'Admin@123',
    department: '',
    designation: '',
    joiningDate: '',
  });

  const [editForm, setEditForm] = useState({
    department: '',
    designation: '',
    joiningDate: '',
  });

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getAll();
      setEmployees(response.data);
    } catch {
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      loadEmployees();
    } else {
      setLoading(false);
    }
  }, [user?.isAdmin]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await employeeService.create(createForm);
      setSuccess('Employee created successfully');
      setShowCreateModal(false);
      setCreateForm({
        fullName: '',
        email: '',
        password: 'Admin@123',
        department: '',
        designation: '',
        joiningDate: '',
      });
      await loadEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create employee');
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setError('');
    setSuccess('');

    try {
      await employeeService.update(selectedEmployee.id, editForm);
      setSuccess('Employee updated successfully');
      setShowEditModal(false);
      setSelectedEmployee(null);
      await loadEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await employeeService.delete(employeeId);
      setSuccess('Employee deleted successfully');
      await loadEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditForm({
      department: employee.department,
      designation: employee.designation,
      joiningDate: employee.joiningDate.split('T')[0],
    });
    setShowEditModal(true);
  };

  // Filter employees based on search and department
  const filteredEmployees = employees.filter((emp) => {
    const nameMatch = !searchTerm ||
      (emp.user?.fullName || emp.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.user?.email || emp.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const deptMatch = !departmentFilter || emp.department?.toLowerCase().includes(departmentFilter.toLowerCase());
    return nameMatch && deptMatch;
  });

  // Get department statistics
  const departmentStats = employees.reduce((acc, emp) => {
    const dept = emp.department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const departmentChartData = Object.entries(departmentStats).map(([name, count]) => ({
    name,
    count,
  }));

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

  const columns = [
    {
      header: 'Name',
      accessor: (row: Employee) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white font-semibold">
            {(row.user?.fullName || row.fullName || 'N')?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.user?.fullName || row.fullName || 'N/A'}</div>
            <div className="text-sm text-gray-500">{row.user?.email || row.email || 'N/A'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (row: Employee) => row.department || 'N/A',
    },
    {
      header: 'Designation',
      accessor: (row: Employee) => row.designation || 'N/A',
    },
    {
      header: 'Joining Date',
      accessor: (row: Employee) => {
        const date = new Date(row.joiningDate);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
      },
    },
    {
      header: 'Actions',
      accessor: (row: Employee) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            icon={FiEdit2}
            onClick={() => openEditModal(row)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={FiTrash2}
            onClick={() => handleDeleteEmployee(row.id)}
            className="text-red-600 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.fullName}!</p>
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

        {user?.isAdmin ? (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Employees"
                value={employees.length}
                icon={FiUsers}
                color="blue"
              />
              <StatCard
                title="Departments"
                value={Object.keys(departmentStats).length}
                icon={FiLayers}
                color="purple"
              />
              <StatCard
                title="New This Month"
                value={employees.filter(e => {
                  const joinDate = new Date(e.joiningDate);
                  const now = new Date();
                  return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
                }).length}
                icon={FiUserPlus}
                color="green"
              />
              <StatCard
                title="Active Today"
                value={employees.length}
                icon={FiBriefcase}
                color="orange"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Employees by Department</h3>
                {departmentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={departmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution</h3>
                {departmentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={departmentChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {departmentChartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                )}
              </Card>
            </div>

            {/* Employee Management */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Employee Management</h2>
                <Button
                  variant="primary"
                  icon={FiUserPlus}
                  onClick={() => setShowCreateModal(true)}
                >
                  Add Employee
                </Button>
              </div>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={FiSearch}
                />
                <Input
                  placeholder="Filter by department..."
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  icon={FiLayers}
                />
              </div>

              {/* Employee Table */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                  <p className="text-gray-600 mt-4">Loading employees...</p>
                </div>
              ) : (
                <Table
                  data={filteredEmployees}
                  columns={columns}
                  keyExtractor={(row) => row.id}
                  emptyMessage="No employees found"
                />
              )}
            </Card>
          </>
        ) : (
          /* Employee View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card hover className="cursor-pointer" onClick={() => navigate('/leaves')}>
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-blue-100 rounded-xl">
                  <FiCalendar className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">My Leaves</h3>
                  <p className="text-gray-600 mt-1">View and manage your leave requests</p>
                </div>
              </div>
            </Card>

            <Card hover className="cursor-pointer" onClick={() => navigate('/profile')}>
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-purple-100 rounded-xl">
                  <FiUser className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
                  <p className="text-gray-600 mt-1">Update your personal information</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Create Employee Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Employee"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateEmployee}>
              Create Employee
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <Input
            label="Full Name"
            value={createForm.fullName}
            onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
            icon={FiUser}
            required
          />
          <Input
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            icon={FiMail}
            required
          />
          <Input
            label="Password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            helperText="Minimum 8 characters"
            required
          />
          <Input
            label="Department"
            value={createForm.department}
            onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
            icon={FiLayers}
            required
          />
          <Input
            label="Designation"
            value={createForm.designation}
            onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
            icon={FiBriefcase}
            required
          />
          <Input
            label="Joining Date"
            type="date"
            value={createForm.joiningDate}
            onChange={(e) => setCreateForm({ ...createForm, joiningDate: e.target.value })}
            icon={FiCalendar}
            required
          />
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Employee"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateEmployee}>
              Update Employee
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUpdateEmployee} className="space-y-4">
          <Input
            label="Department"
            value={editForm.department}
            onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
            icon={FiLayers}
            required
          />
          <Input
            label="Designation"
            value={editForm.designation}
            onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
            icon={FiBriefcase}
            required
          />
          <Input
            label="Joining Date"
            type="date"
            value={editForm.joiningDate}
            onChange={(e) => setEditForm({ ...editForm, joiningDate: e.target.value })}
            icon={FiCalendar}
            required
          />
        </form>
      </Modal>
    </Layout>
  );
};
