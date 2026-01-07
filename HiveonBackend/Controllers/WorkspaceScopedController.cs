using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace HiveonBackend.Controllers.Base
{
    [ApiController]
    public abstract class WorkspaceScopedController : ControllerBase
    {
        protected Guid GetWorkspaceId()
        {
            var workspaceClaim = User.FindFirst("workspaceId")?.Value;

            if (string.IsNullOrWhiteSpace(workspaceClaim))
                throw new UnauthorizedAccessException("Workspace not selected.");

            if (!Guid.TryParse(workspaceClaim, out var workspaceId))
                throw new UnauthorizedAccessException("Invalid workspace.");

            return workspaceId;
        }

        protected Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!Guid.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("Invalid user.");

            return userId;
        }
    }
}
