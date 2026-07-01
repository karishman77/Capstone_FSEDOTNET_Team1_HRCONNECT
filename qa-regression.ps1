$ErrorActionPreference = 'Stop'

function LogResult($name, $passed, $detail) {
  if ($passed) { Write-Output "PASS|$name|$detail" }
  else { Write-Output "FAIL|$name|$detail" }
}

$base = 'http://localhost:5000'
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$testEmail = "qa.user.$ts@example.com"
$testName = "QA User $ts"
$leaveId = $null

try {
  $adminBody = @{ email='admin@example.com'; password='Admin@123' } | ConvertTo-Json
  $adminResp = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType 'application/json' -Body $adminBody
  $adminToken = $adminResp.token
  LogResult 'Auth.AdminLogin' ([string]::IsNullOrWhiteSpace($adminToken) -eq $false) 'Admin token received'
} catch {
  LogResult 'Auth.AdminLogin' $false $_.Exception.Message
  throw
}

try {
  $badBody = @{ email='admin@example.com'; password='Wrong@123' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType 'application/json' -Body $badBody | Out-Null
  LogResult 'Auth.InvalidLogin' $false 'Expected 401, got success'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  LogResult 'Auth.InvalidLogin' ($code -eq 401) "HTTP $code"
}

try {
  Invoke-RestMethod -Uri "$base/api/employees" -Method GET | Out-Null
  LogResult 'Employees.UnauthorizedAccess' $false 'Expected 401, got success'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  LogResult 'Employees.UnauthorizedAccess' ($code -eq 401) "HTTP $code"
}

$adminHeaders = @{ Authorization = "Bearer $adminToken" }

try {
  $badCreate = @{ fullName=''; email=''; department='IT'; designation='Engineer'; joiningDate='2026-06-30' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/api/employees" -Method POST -Headers $adminHeaders -ContentType 'application/json' -Body $badCreate | Out-Null
  LogResult 'Employees.CreateMissingFields' $false 'Expected 400, got success'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  LogResult 'Employees.CreateMissingFields' ($code -eq 400) "HTTP $code"
}

try {
  $createBody = @{ fullName=$testName; email=$testEmail; department='QA'; designation='Tester'; joiningDate='2026-06-30' } | ConvertTo-Json
  $created = Invoke-RestMethod -Uri "$base/api/employees" -Method POST -Headers $adminHeaders -ContentType 'application/json' -Body $createBody
  $createdId = $created.id
  LogResult 'Employees.CreateValid' (-not [string]::IsNullOrWhiteSpace($createdId)) "Created $createdId"
} catch {
  LogResult 'Employees.CreateValid' $false $_.Exception.Message
}

try {
  $dupBody = @{ fullName='Duplicate'; email=$testEmail; department='QA'; designation='Tester'; joiningDate='2026-06-30' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/api/employees" -Method POST -Headers $adminHeaders -ContentType 'application/json' -Body $dupBody | Out-Null
  LogResult 'Employees.CreateDuplicateEmail' $false 'Expected 400, got success'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  LogResult 'Employees.CreateDuplicateEmail' ($code -eq 400) "HTTP $code"
}

try {
  $empLogin = @{ email=$testEmail; password='DefaultPassword@123' } | ConvertTo-Json
  $empResp = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType 'application/json' -Body $empLogin
  $empToken = $empResp.token
  $isAdmin = [bool]$empResp.user.isAdmin
  LogResult 'Auth.EmployeeLogin' ((-not [string]::IsNullOrWhiteSpace($empToken)) -and ($isAdmin -eq $false)) 'Employee token received'
} catch {
  LogResult 'Auth.EmployeeLogin' $false $_.Exception.Message
}

$empHeaders = @{ Authorization = "Bearer $empToken" }

try {
  Invoke-RestMethod -Uri "$base/api/employees" -Method GET -Headers $empHeaders | Out-Null
  LogResult 'Employees.EmployeeShouldNotListAll' $false 'Employee can list all employees (policy gap)'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  LogResult 'Employees.EmployeeShouldNotListAll' ($code -eq 403) "HTTP $code"
}

try {
  $balances = Invoke-RestMethod -Uri "$base/api/leaves/balances/my" -Method GET -Headers $empHeaders
  LogResult 'Leaves.MyBalances' ($balances.Count -ge 1) "Count $($balances.Count)"
} catch {
  LogResult 'Leaves.MyBalances' $false $_.Exception.Message
}

try {
  $leaveBody = @{ leaveType='Casual'; startDate='2026-07-10'; endDate='2026-07-11'; reason='QA leave' } | ConvertTo-Json
  $leave = Invoke-RestMethod -Uri "$base/api/leaves" -Method POST -Headers $empHeaders -ContentType 'application/json' -Body $leaveBody
  $leaveId = $leave.id
  LogResult 'Leaves.CreateValid' (-not [string]::IsNullOrWhiteSpace($leaveId)) "Leave $leaveId status $($leave.status)"
} catch {
  LogResult 'Leaves.CreateValid' $false $_.Exception.Message
}

try {
  $overlapBody = @{ leaveType='Casual'; startDate='2026-07-10'; endDate='2026-07-11'; reason='Overlap test' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/api/leaves" -Method POST -Headers $empHeaders -ContentType 'application/json' -Body $overlapBody | Out-Null
  LogResult 'Leaves.CreateOverlap' $false 'Expected 400, got success'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  LogResult 'Leaves.CreateOverlap' ($code -eq 400) "HTTP $code"
}

if ($leaveId) {
  try {
    $approveBody = @{ status='Approved'; adminComments='qa approval' } | ConvertTo-Json
    $updated = Invoke-RestMethod -Uri "$base/api/leaves/$leaveId/status" -Method PUT -Headers $adminHeaders -ContentType 'application/json' -Body $approveBody
    LogResult 'Leaves.ApproveSingleStep' ($updated.status -eq 'Approved') "Status $($updated.status)"
  } catch {
    LogResult 'Leaves.ApproveSingleStep' $false $_.Exception.Message
  }

  try {
    $approveAgainBody = @{ status='Approved'; adminComments='again' } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/api/leaves/$leaveId/status" -Method PUT -Headers $adminHeaders -ContentType 'application/json' -Body $approveAgainBody | Out-Null
    LogResult 'Leaves.ReapproveFinalState' $false 'Expected 400, got success'
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    LogResult 'Leaves.ReapproveFinalState' ($code -eq 400) "HTTP $code"
  }
}

$limitHit = $false
for ($i=0; $i -lt 120; $i++) {
  try {
    Invoke-RestMethod -Uri "$base/api/employees" -Method GET -Headers $adminHeaders | Out-Null
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 429) { $limitHit = $true; break }
  }
}
LogResult 'RateLimit.ExcessRequests' $limitHit '429 observed within 120 requests'
