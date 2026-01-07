using HiveonBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HiveonBackend.Controllers;

[ApiController]
[Route("api/pm/dashboard")]
[Authorize(Roles = "ProjectManager")]
public class PmDashboardController : ControllerBase
{
    private readonly IPmDashboardService _svc;
    public PmDashboardController(IPmDashboardService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid projectId, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); // ensure you add this claim at login
        var dto = await _svc.GetAsync(userId, projectId, ct);
        return Ok(dto);
    }
}
