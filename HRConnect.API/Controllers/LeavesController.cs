using HRConnect.API.DTOs;
using HRConnect.API.Services;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HRConnect.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeavesController : ControllerBase
{
    private readonly ILeaveService _leaveService;

    public LeavesController(ILeaveService leaveService)
    {
        _leaveService = leaveService;
    }

    [HttpGet("mine")]
    public async Task<ActionResult<List<LeaveRequestDto>>> GetMyLeaves(IEmployeeService employeeService)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var userIdGuid = Guid.Parse(userId);
        var employee = await employeeService.GetByUserIdAsync(userIdGuid);
        if (employee == null)
            return BadRequest(new { message = "Employee record not found for this user." });

        return Ok(await _leaveService.GetByEmployeeAsync(employee.Id));
    }

    [HttpGet("balances/my")]
    public async Task<ActionResult<List<LeaveBalanceDto>>> GetMyBalances(IEmployeeService employeeService)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var userIdGuid = Guid.Parse(userId);
        var employee = await employeeService.GetByUserIdAsync(userIdGuid);
        if (employee == null)
            return BadRequest("Employee record not found");

        var balances = await _leaveService.GetLeaveBalancesAsync(employee.Id);
        return Ok(balances);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<LeaveRequestDto>> GetById(Guid id)
    {
        var leave = await _leaveService.GetByIdAsync(id);
        if (leave == null)
            return NotFound();
        return Ok(leave);
    }

    [HttpGet("employee/{employeeId}")]
    public async Task<ActionResult<List<LeaveRequestDto>>> GetByEmployee(Guid employeeId)
    {
        var leaves = await _leaveService.GetByEmployeeAsync(employeeId);
        return Ok(leaves);
    }

    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<List<LeaveRequestDto>>> GetAll()
    {
        var leaves = await _leaveService.GetAllAsync();
        return Ok(leaves);
    }

    [HttpGet("analytics")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<LeaveAnalyticsDto>> GetAnalytics()
    {
        var analytics = await _leaveService.GetAnalyticsAsync();
        return Ok(analytics);
    }

    [HttpPost("carry-forward")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<CarryForwardResultDto>> ApplyCarryForward([FromQuery] int? fromYear, [FromQuery] int? toYear, [FromQuery] int maxCarryForwardDays = 5)
    {
        var sourceYear = fromYear ?? (DateTime.UtcNow.Year - 1);
        var targetYear = toYear ?? DateTime.UtcNow.Year;

        var result = await _leaveService.ApplyCarryForwardAsync(sourceYear, targetYear, maxCarryForwardDays);
        return Ok(result);
    }

    [HttpGet("export/excel")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ExportExcel()
    {
        var leaves = await _leaveService.GetAllAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Leave Report");

        worksheet.Cell(1, 1).Value = "Employee Name";
        worksheet.Cell(1, 2).Value = "Employee Email";
        worksheet.Cell(1, 3).Value = "Leave Type";
        worksheet.Cell(1, 4).Value = "Start Date";
        worksheet.Cell(1, 5).Value = "End Date";
        worksheet.Cell(1, 6).Value = "Days";
        worksheet.Cell(1, 7).Value = "Status";
        worksheet.Cell(1, 8).Value = "Reason";
        worksheet.Cell(1, 9).Value = "Admin Comments";
        worksheet.Cell(1, 10).Value = "Created At";

        for (var i = 0; i < leaves.Count; i++)
        {
            var leave = leaves[i];
            var row = i + 2;

            worksheet.Cell(row, 1).Value = leave.Employee?.User?.FullName ?? "N/A";
            worksheet.Cell(row, 2).Value = leave.Employee?.User?.Email ?? "N/A";
            worksheet.Cell(row, 3).Value = leave.LeaveType;
            worksheet.Cell(row, 4).Value = leave.StartDate.ToString("yyyy-MM-dd");
            worksheet.Cell(row, 5).Value = leave.EndDate.ToString("yyyy-MM-dd");
            worksheet.Cell(row, 6).Value = leave.NumberOfDays;
            worksheet.Cell(row, 7).Value = leave.Status;
            worksheet.Cell(row, 8).Value = leave.Reason;
            worksheet.Cell(row, 9).Value = leave.AdminComments ?? string.Empty;
            worksheet.Cell(row, 10).Value = leave.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss");
        }

        var headerRange = worksheet.Range(1, 1, 1, 10);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;
        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var fileName = $"leave-report-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx";
        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName
        );
    }

    [HttpPost]
    public async Task<ActionResult<LeaveRequestDto>> Create(CreateLeaveRequestDto request, IEmployeeService employeeService)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var userIdGuid = Guid.Parse(userId);
        var employee = await employeeService.GetByUserIdAsync(userIdGuid);
        if (employee == null)
            return BadRequest(new { message = "Employee record not found for this user. Please contact HR." });
        
        try
        {
            var leave = await _leaveService.CreateAsync(employee.Id, request);
            return CreatedAtAction(nameof(GetById), new { id = leave.Id }, leave);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}/status")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<LeaveRequestDto>> UpdateStatus(Guid id, UpdateLeaveRequestStatusDto request)
    {
        try
        {
            var leave = await _leaveService.UpdateStatusAsync(id, request);
            if (leave == null)
                return NotFound();
            return Ok(leave);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var success = await _leaveService.CancelAsync(id);
        if (!success)
            return NotFound();
        return NoContent();
    }

    [HttpGet("{employeeId}/balances")]
    public async Task<ActionResult<List<LeaveBalanceDto>>> GetLeaveBalances(Guid employeeId)
    {
        var balances = await _leaveService.GetLeaveBalancesAsync(employeeId);
        return Ok(balances);
    }
}
