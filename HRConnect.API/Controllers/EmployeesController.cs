using HRConnect.API.DTOs;
using HRConnect.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

namespace HRConnect.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
    }

    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<List<EmployeeDto>>> GetAll([FromQuery] string? name, [FromQuery] string? department)
    {
        if (!string.IsNullOrEmpty(name) || !string.IsNullOrEmpty(department))
        {
            var searchResults = await _employeeService.SearchAsync(name, department);
            return Ok(searchResults);
        }

        var employees = await _employeeService.GetAllAsync();
        return Ok(employees);
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<EmployeeDto>> GetById(Guid id)
    {
        var employee = await _employeeService.GetByIdAsync(id);
        if (employee == null)
            return NotFound();
        return Ok(employee);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<EmployeeDto>> Create(CreateEmployeeRequest request)
    {
        try
        {
            var employee = await _employeeService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = employee.Id }, employee);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException)
        {
            return BadRequest(new { message = "Unable to create employee. Please verify the details and try again." });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<EmployeeDto>> Update(Guid id, UpdateEmployeeRequest request)
    {
        var employee = await _employeeService.UpdateAsync(id, request);
        if (employee == null)
            return NotFound();
        return Ok(employee);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _employeeService.DeleteAsync(id);
        if (!success)
            return NotFound();
        return NoContent();
    }
}
