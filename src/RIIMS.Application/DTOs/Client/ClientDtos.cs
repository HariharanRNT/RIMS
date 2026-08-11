namespace RIIMS.Application.DTOs.Client;

public class ClientDto
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? Country { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public string? Pincode { get; set; }
    public string? PAN { get; set; }
    public string? GSTNo { get; set; }
    public string? HSN { get; set; }
    public string? CIN { get; set; }
    public bool IsActive { get; set; }
}

public class CreateClientRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? Country { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public string? Pincode { get; set; }
    public string? PAN { get; set; }
    public string? GSTNo { get; set; }
    public string? HSN { get; set; }
    public string? CIN { get; set; }
}

public class UpdateClientRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? Country { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public string? Pincode { get; set; }
    public string? PAN { get; set; }
    public string? GSTNo { get; set; }
    public string? HSN { get; set; }
    public string? CIN { get; set; }
}
