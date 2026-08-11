using FluentValidation;
using RIIMS.Application.DTOs.Client;

namespace RIIMS.Application.Validators;

public class CreateClientRequestValidator : AbstractValidator<CreateClientRequest>
{
    public CreateClientRequestValidator()
    {
        RuleFor(x => x.CompanyName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CustomerName).NotEmpty().MaximumLength(150);
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
        RuleFor(x => x.CompanyName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CustomerName).NotEmpty().MaximumLength(150);
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
