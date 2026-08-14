using FluentValidation;
using RIIMS.Application.DTOs.Support;
using RIIMS.Application.DTOs.Task;

namespace RIIMS.Application.Validators;

public class StartTaskRequestValidator : AbstractValidator<StartTaskRequest>
{
    public StartTaskRequestValidator()
    {
        RuleFor(x => x)
            .Must(x => (x.ProductId.HasValue && x.ProductId > 0) || !string.IsNullOrWhiteSpace(x.CustomProductName))
            .WithMessage("Product selection or custom product name is required.");

        RuleFor(x => x)
            .Must(x => (x.ClientId.HasValue && x.ClientId > 0) || !string.IsNullOrWhiteSpace(x.CustomClientName))
            .WithMessage("Client selection or custom client name is required.");

        RuleFor(x => x.ModuleName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
    }
}

public class AssignTaskRequestValidator : AbstractValidator<AssignTaskRequest>
{
    public AssignTaskRequestValidator()
    {
        RuleFor(x => x.EmployeeId).GreaterThan(0).WithMessage("Target employee selection is required.");
        RuleFor(x => x)
            .Must(x => (x.ProductId.HasValue && x.ProductId > 0) || !string.IsNullOrWhiteSpace(x.CustomProductName))
            .WithMessage("Product selection or custom product name is required.");

        RuleFor(x => x)
            .Must(x => (x.ClientId.HasValue && x.ClientId > 0) || !string.IsNullOrWhiteSpace(x.CustomClientName))
            .WithMessage("Client selection or custom client name is required.");

        RuleFor(x => x.ModuleName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
    }
}

public class StopSupportRequestValidator : AbstractValidator<StopSupportRequest>
{
    public StopSupportRequestValidator()
    {
        RuleFor(x => x.Remarks).NotEmpty().MaximumLength(500).WithMessage("Remarks are required to stop support activity.");
        RuleFor(x => x)
            .Must(x => (x.ProductId.HasValue && x.ProductId > 0) || !string.IsNullOrWhiteSpace(x.CustomProductName))
            .WithMessage("Product selection or custom product name is required.");
        RuleFor(x => x)
            .Must(x => (x.ClientId.HasValue && x.ClientId > 0) || !string.IsNullOrWhiteSpace(x.CustomClientName))
            .WithMessage("Client selection or custom client name is required.");
    }
}
