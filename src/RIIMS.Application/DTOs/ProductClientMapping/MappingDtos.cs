namespace RIIMS.Application.DTOs.ProductClientMapping;

public class ProductClientMappingDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public int ClientId { get; set; }
    public string ClientCompanyName { get; set; } = string.Empty;
    public string ClientCustomerName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class CreateMappingRequest
{
    public int ProductId { get; set; }
    public int ClientId { get; set; }
}
