namespace RIIMS.Application.DTOs.ProductDeployment;

public class EmployeeProductAccessDto
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string DesignationName { get; set; } = string.Empty;
    public bool HasPermission { get; set; }
    public List<int> AssignedProductIds { get; set; } = new List<int>();
    public List<string> AssignedProductNames { get; set; } = new List<string>();
}

public class UpdateEmployeeProductAccessRequest
{
    public int EmployeeId { get; set; }
    public bool HasPermission { get; set; }
    public List<int> AssignedProductIds { get; set; } = new List<int>();
}

public class AuthorizedProductOptionDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public List<AuthorizedClientOptionDto> MappedClients { get; set; } = new List<AuthorizedClientOptionDto>();
}

public class AuthorizedClientOptionDto
{
    public int ClientId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
}

public class ProductDeploymentFilter
{
    public string? Search { get; set; }
    public int? ProductId { get; set; }
    public int? ClientId { get; set; }
    public string? Status { get; set; }
    public string? Version { get; set; }
    public int? EmployeeId { get; set; }
    public DateTime? IssueDateFrom { get; set; }
    public DateTime? IssueDateTo { get; set; }
    public DateTime? DeliveryDateFrom { get; set; }
    public DateTime? DeliveryDateTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}
