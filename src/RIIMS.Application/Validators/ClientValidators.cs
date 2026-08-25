using FluentValidation;
using RIIMS.Application.DTOs.Client;

namespace RIIMS.Application.Validators;

public class CreateClientRequestValidator : AbstractValidator<CreateClientRequest>
{
    public CreateClientRequestValidator()
    {
        RuleFor(x => x.CompanyName)
            .NotEmpty().WithMessage("Company name is required.")
            .MaximumLength(200).WithMessage("Company name cannot exceed 200 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Company name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Company name contains invalid characters.");

        RuleFor(x => x.CustomerName)
            .NotEmpty().WithMessage("Customer name is required.")
            .MaximumLength(150).WithMessage("Customer name cannot exceed 150 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Customer name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Customer name contains invalid characters.");

        RuleFor(x => x.Country)
            .Must(c => string.IsNullOrWhiteSpace(c) || (!c.Contains("<") && !c.Contains(">")))
            .WithMessage("Country cannot contain HTML or script characters (< or >).");

        RuleFor(x => x.State)
            .Must(s => string.IsNullOrWhiteSpace(s) || (!s.Contains("<") && !s.Contains(">")))
            .WithMessage("State cannot contain HTML or script characters (< or >).");

        RuleFor(x => x.City)
            .Must(c => string.IsNullOrWhiteSpace(c) || (!c.Contains("<") && !c.Contains(">")))
            .WithMessage("City cannot contain HTML or script characters (< or >).");

        RuleFor(x => x.PAN)
            .Matches(@"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
            .When(x => !string.IsNullOrWhiteSpace(x.PAN))
            .WithMessage("PAN format must be valid (e.g. ABCDE1234F).");

        RuleFor(x => x.GSTNo)
            .Matches(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
            .When(x => !string.IsNullOrWhiteSpace(x.GSTNo))
            .WithMessage("GST number format must be valid.");
    }
}

public class UpdateClientRequestValidator : AbstractValidator<UpdateClientRequest>
{
    public UpdateClientRequestValidator()
    {
        RuleFor(x => x.CompanyName)
            .NotEmpty().WithMessage("Company name is required.")
            .MaximumLength(200).WithMessage("Company name cannot exceed 200 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Company name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Company name contains invalid characters.");

        RuleFor(x => x.CustomerName)
            .NotEmpty().WithMessage("Customer name is required.")
            .MaximumLength(150).WithMessage("Customer name cannot exceed 150 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Customer name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Customer name contains invalid characters.");

        RuleFor(x => x.Country)
            .Must(c => string.IsNullOrWhiteSpace(c) || (!c.Contains("<") && !c.Contains(">")))
            .WithMessage("Country cannot contain HTML or script characters (< or >).");

        RuleFor(x => x.State)
            .Must(s => string.IsNullOrWhiteSpace(s) || (!s.Contains("<") && !s.Contains(">")))
            .WithMessage("State cannot contain HTML or script characters (< or >).");

        RuleFor(x => x.City)
            .Must(c => string.IsNullOrWhiteSpace(c) || (!c.Contains("<") && !c.Contains(">")))
            .WithMessage("City cannot contain HTML or script characters (< or >).");

        RuleFor(x => x.PAN)
            .Matches(@"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
            .When(x => !string.IsNullOrWhiteSpace(x.PAN))
            .WithMessage("PAN format must be valid.");

        RuleFor(x => x.GSTNo)
            .Matches(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
            .When(x => !string.IsNullOrWhiteSpace(x.GSTNo))
            .WithMessage("GST number format must be valid.");
    }
}
