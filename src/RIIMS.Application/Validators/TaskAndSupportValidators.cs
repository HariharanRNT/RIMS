using FluentValidation;
using RIIMS.Application.DTOs.Support;
using RIIMS.Application.DTOs.Task;

namespace RIIMS.Application.Validators;

public class StartTaskRequestValidator : AbstractValidator<StartTaskRequest>
{
    public StartTaskRequestValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("Product is required.");
        RuleFor(x => x.ClientId).GreaterThan(0).WithMessage("Client is required.");
        RuleFor(x => x.ModuleName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
    }
}

public class StopSupportRequestValidator : AbstractValidator<StopSupportRequest>
{
    public StopSupportRequestValidator()
    {
        RuleFor(x => x.Remarks).NotEmpty().MaximumLength(500).WithMessage("Remarks are required to stop support activity.");
        RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("Product selection is required.");
        RuleFor(x => x.ClientId).GreaterThan(0).WithMessage("Client selection is required.");
    }
}
