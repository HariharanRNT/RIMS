using Microsoft.AspNetCore.Authorization;

namespace RIIMS.API.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "PERMISSION_";

    public RequirePermissionAttribute(params string[] permissions)
    {
        Permissions = permissions;
        Policy = $"{PolicyPrefix}{string.Join(",", permissions)}";
    }

    public string[] Permissions { get; }
}
