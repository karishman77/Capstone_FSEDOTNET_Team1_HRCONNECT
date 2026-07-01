export interface User {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
}

export interface Employee {
  id: string;
  userId: string;
  department: string;
  designation: string;
  joiningDate: string;
  fullName?: string;
  email?: string;
  user?: User;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
  numberOfDays: number;
  createdAt: string;
  approvedAt?: string;
  adminComments?: string;
  employee?: Employee;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
}

export interface LeaveTypeAnalytics {
  leaveType: string;
  totalAllocatedDays: number;
  usedDays: number;
  remainingDays: number;
  utilizationPercentage: number;
}

export interface LeaveAnalytics {
  totalRequests: number;
  pendingRequests: number;
  managerApprovedRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  byLeaveType: LeaveTypeAnalytics[];
}

export interface CarryForwardResult {
  updatedBalances: number;
  fromYear: number;
  toYear: number;
  maxCarryForwardDays: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}
