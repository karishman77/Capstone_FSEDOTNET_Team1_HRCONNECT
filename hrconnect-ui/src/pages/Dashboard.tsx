import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { employeeService } from '../services/api';
import { Employee } from '../types';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    department: '',
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [submittingEmployeeId, setSubmittingEmployeeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    department: '',
    designation: '',
    joiningDate: '',
  });
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: 'Admin@123',
    department: '',
    designation: '',
    joiningDate: '',
  });

  const sanitizeDisplayText = (value?: string) => {
    if (!value) {
      return 'N/A';
    }

    // Remove zero-width/invisible characters that can render as blank values.
    const normalized = value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    return normalized || 'N/A';
  };

  const formatJoiningDate = (value?: string) => {
    if (!value) {
      return 'N/A';
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? 'N/A' : parsedDate.toLocaleDateString();
  };

  const loadEmployees = async (name?: string, department?: string) => {
    try {
      const hasFilters = !!name || !!department;
      const response = hasFilters
        ? await employeeService.search(name, department)
        : await employeeService.getAll();
      setEmployees(response.data);
    } catch {
      setError('Failed to load employees');
    }
  };

  useEffect(() => {
    const init = async () => {
      if (user?.isAdmin) {
        await loadEmployees();
      }
      setLoading(false);
    };

    init();
  }, [user?.isAdmin]);

  const startEdit = (employee: Employee) => {
    setError('');
    setSuccess('');
    setEditingEmployeeId(employee.id);
    setEditForm({
      department: employee.department,
      designation: employee.designation,
      joiningDate: employee.joiningDate.split('T')[0],
    });
  };

  const cancelEdit = () => {
    setEditingEmployeeId(null);
    setSubmittingEmployeeId(null);
  };

  const saveEdit = async (employeeId: string) => {
    if (!editForm.department || !editForm.designation || !editForm.joiningDate) {
      setError('Please fill all employee fields before saving');
      return;
    }

    setError('');
    setSuccess('');
    setSubmittingEmployeeId(employeeId);

    try {
      await employeeService.update(employeeId, {
        department: editForm.department,
        designation: editForm.designation,
        joiningDate: editForm.joiningDate,
      });
      setSuccess('Employee updated successfully');
      setEditingEmployeeId(null);
      await loadEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update employee');
    } finally {
      setSubmittingEmployeeId(null);
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    setError('');
    setSuccess('');
    setSubmittingEmployeeId(employeeId);

    try {
      await employeeService.delete(employeeId);
      setSuccess('Employee deleted successfully');
      if (editingEmployeeId === employeeId) {
        setEditingEmployeeId(null);
      }
      await loadEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete employee');
    } finally {
      setSubmittingEmployeeId(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    await loadEmployees(filters.name.trim() || undefined, filters.department.trim() || undefined);
    setLoading(false);
  };

  const clearSearch = async () => {
    setFilters({ name: '', department: '' });
    setError('');
    setSuccess('');
    setLoading(true);
    await loadEmployees();
    setLoading(false);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const fullName = createForm.fullName.trim();
    const email = createForm.email.trim();
    const password = createForm.password.trim();
    const department = createForm.department.trim();
    const designation = createForm.designation.trim();
    const joiningDate = createForm.joiningDate;

    if (!fullName || !email || !password || !department || !designation || !joiningDate) {
      setError('Please complete all fields to add a new employee');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await employeeService.create({
        fullName,
        email,
        password,
        department,
        designation,
        joiningDate,
      });

      setCreateForm({
        fullName: '',
        email: '',
        password: 'Admin@123',
        department: '',
        designation: '',
        joiningDate: '',
      });
      setShowCreateForm(false);
      setSuccess('Employee created successfully');
      await loadEmployees(filters.name.trim() || undefined, filters.department.trim() || undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>HRConnect Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.fullName}</span>
          {user?.isAdmin && <span className="admin-badge">Admin</span>}
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button className="nav-btn active">Dashboard</button>
        <button className="nav-btn" onClick={() => navigate('/leaves')}>My Leaves</button>
        <button className="nav-btn" onClick={() => navigate('/profile')}>My Profile</button>
        {user?.isAdmin && (
          <button className="nav-btn" onClick={() => navigate('/leave-approvals')}>Leave Approvals</button>
        )}
      </nav>

      <div className="dashboard-content">
        {user?.isAdmin ? (
          <>
            <div className="stats-section">
              <div className="stat-card">
                <h3>Total Employees</h3>
                <p className="stat-number">{employees.length}</p>
              </div>
            </div>

            <div className="section">
              <h2>Employees</h2>
            <div className="create-employee-block">
              <button
                type="button"
                className="create-employee-toggle"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? 'Cancel Add Employee' : 'Add Employee'}
              </button>

              {showCreateForm && (
                <form className="create-employee-form" onSubmit={handleCreateEmployee} autoComplete="off">
                  <input
                    className="create-input"
                    placeholder="Full Name"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    autoComplete="off"
                  />
                  <input
                    className="create-input"
                    placeholder="Email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    name="employeeEmail"
                    autoComplete="off"
                  />
                  <input
                    className="create-input"
                    placeholder="Password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    name="employeePassword"
                    autoComplete="new-password"
                  />
                  <input
                    className="create-input"
                    placeholder="Department"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  />
                  <input
                    className="create-input"
                    placeholder="Designation"
                    value={createForm.designation}
                    onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                  />
                  <input
                    className="create-input"
                    type="date"
                    value={createForm.joiningDate}
                    onChange={(e) => setCreateForm({ ...createForm, joiningDate: e.target.value })}
                  />
                  <button type="submit" className="create-submit-btn">
                    Save Employee
                  </button>
                </form>
              )}
            </div>
          

          <form className="employee-search" onSubmit={handleSearch}>
            <input
              className="search-input"
              placeholder="Search by employee name"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            />
            <input
              className="search-input"
              placeholder="Filter by department"
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            />
            <button type="submit" className="search-btn">
              Search
            </button>
            <button type="button" className="reset-btn" onClick={clearSearch}>
              Reset
            </button>
          </form>
          {loading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          {!loading && employees.length === 0 && <p>No employees found</p>}
          {!loading && employees.length > 0 && (
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joining Date</th>
                  {user?.isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{sanitizeDisplayText(emp.user?.fullName || emp.fullName)}</td>
                    <td>{sanitizeDisplayText(emp.user?.email || emp.email)}</td>
                    {editingEmployeeId === emp.id ? (
                      <>
                        <td>
                          <input
                            className="table-input"
                            value={editForm.department}
                            onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="table-input"
                            value={editForm.designation}
                            onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="table-input"
                            type="date"
                            value={editForm.joiningDate}
                            onChange={(e) => setEditForm({ ...editForm, joiningDate: e.target.value })}
                          />
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="action-btn save"
                              onClick={() => saveEdit(emp.id)}
                              disabled={submittingEmployeeId === emp.id}
                            >
                              Save
                            </button>
                            <button
                              className="action-btn cancel"
                              onClick={cancelEdit}
                              disabled={submittingEmployeeId === emp.id}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{sanitizeDisplayText(emp.department)}</td>
                        <td>{sanitizeDisplayText(emp.designation)}</td>
                        <td>{formatJoiningDate(emp.joiningDate)}</td>
                        {user?.isAdmin && (
                          <td>
                            <div className="table-actions">
                              <button
                                className="action-btn edit"
                                onClick={() => startEdit(emp)}
                                disabled={submittingEmployeeId === emp.id}
                              >
                                Edit
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => deleteEmployee(emp.id)}
                                disabled={submittingEmployeeId === emp.id}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
            </div>
          </>
        ) : (
          <div className="section">
            <h2>Employee Dashboard</h2>
            <p>Use My Leaves to check balances, apply for leave, and track request status.</p>
            <div className="table-actions">
              <button className="action-btn edit" onClick={() => navigate('/leaves')}>Go To My Leaves</button>
              <button className="action-btn save" onClick={() => navigate('/profile')}>Go To My Profile</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
