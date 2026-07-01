using System.Security.Claims;
using HRConnect.API.Data;
using HRConnect.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRConnect.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly HRConnectDbContext _context;

    public UsersController(HRConnectDbContext context)
    {
        _context = context;
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetMyProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var userIdGuid = Guid.Parse(userId);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userIdGuid);
        if (user == null)
            return NotFound();

        return Ok(new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            IsAdmin = user.IsAdmin
        });
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserDto>> UpdateMyProfile(UpdateUserProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Full name is required." });

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var userIdGuid = Guid.Parse(userId);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userIdGuid);
        if (user == null)
            return NotFound();

        user.FullName = request.FullName.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return Ok(new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            IsAdmin = user.IsAdmin
        });
    }
}
