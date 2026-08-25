using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Authorization;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IServiceProvider _serviceProvider;

    public PermissionAuthorizationHandler(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            return;
        }

        var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return;
        }

        // Check if user has Super Admin or Admin role in claims
        var roles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        if (roles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) || roles.Contains("Admin", StringComparer.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
            return;
        }

        using var scope = _serviceProvider.CreateScope();
        var permissionService = scope.ServiceProvider.GetRequiredService<IPermissionManagementService>();

        var userPermissions = await permissionService.GetUserPermissionCodesAsync(userId);

        // If requirement has permissions, user must possess at least one of the specified permissions
        if (requirement.Permissions.Length == 0 ||
            requirement.Permissions.Any(reqPerm => userPermissions.Contains(reqPerm, StringComparer.OrdinalIgnoreCase)))
        {
            context.Succeed(requirement);
        }
    }
}
