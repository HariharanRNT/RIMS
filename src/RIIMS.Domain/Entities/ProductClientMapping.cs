using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class ProductClientMapping : BaseEntity
{
    public int ProductId { get; set; }
    public int ClientId { get; set; }

    // Navigation
    public Product Product { get; set; } = null!;
    public Client Client { get; set; } = null!;
}
