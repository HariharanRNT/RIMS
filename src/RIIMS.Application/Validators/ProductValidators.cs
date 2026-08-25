using FluentValidation;
using RIIMS.Application.DTOs.Product;

namespace RIIMS.Application.Validators;

public class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Product name is required.")
            .MaximumLength(150).WithMessage("Product name cannot exceed 150 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Product name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Product name contains invalid characters.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Product code is required.")
            .MaximumLength(30).WithMessage("Product code cannot exceed 30 characters.")
            .Matches(@"^[A-Za-z0-9\-_.]+$")
            .WithMessage("Product code can only contain letters, numbers, hyphens, underscores, and periods.");
    }
}

public class UpdateProductRequestValidator : AbstractValidator<UpdateProductRequest>
{
    public UpdateProductRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Product name is required.")
            .MaximumLength(150).WithMessage("Product name cannot exceed 150 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Product name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Product name contains invalid characters.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Product code is required.")
            .MaximumLength(30).WithMessage("Product code cannot exceed 30 characters.")
            .Matches(@"^[A-Za-z0-9\-_.]+$")
            .WithMessage("Product code can only contain letters, numbers, hyphens, underscores, and periods.");
    }
}
