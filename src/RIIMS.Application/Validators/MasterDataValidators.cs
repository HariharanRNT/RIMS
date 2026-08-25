using FluentValidation;
using RIIMS.Application.DTOs.Department;
using RIIMS.Application.DTOs.Designation;
using RIIMS.Application.DTOs.Lookup;

namespace RIIMS.Application.Validators;

public class CreateDepartmentRequestValidator : AbstractValidator<CreateDepartmentRequest>
{
    public CreateDepartmentRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Department name is required.")
            .MaximumLength(100).WithMessage("Department name cannot exceed 100 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Department name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Department name contains invalid characters.");
    }
}

public class UpdateDepartmentRequestValidator : AbstractValidator<UpdateDepartmentRequest>
{
    public UpdateDepartmentRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Department name is required.")
            .MaximumLength(100).WithMessage("Department name cannot exceed 100 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Department name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Department name contains invalid characters.");
    }
}

public class CreateDesignationRequestValidator : AbstractValidator<CreateDesignationRequest>
{
    public CreateDesignationRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Designation name is required.")
            .MaximumLength(100).WithMessage("Designation name cannot exceed 100 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Designation name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Designation name contains invalid characters.");
    }
}

public class UpdateDesignationRequestValidator : AbstractValidator<UpdateDesignationRequest>
{
    public UpdateDesignationRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Designation name is required.")
            .MaximumLength(100).WithMessage("Designation name cannot exceed 100 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Designation name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Designation name contains invalid characters.");
    }
}

public class CreateLookupRequestValidator : AbstractValidator<CreateLookupRequest>
{
    public CreateLookupRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(50).WithMessage("Name cannot exceed 50 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Name contains invalid characters.");
    }
}

public class UpdateLookupRequestValidator : AbstractValidator<UpdateLookupRequest>
{
    public UpdateLookupRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(50).WithMessage("Name cannot exceed 50 characters.")
            .Must(name => !name.Contains("<") && !name.Contains(">"))
            .WithMessage("Name cannot contain HTML or script characters (< or >).")
            .Matches(@"^[a-zA-Z0-9\s\-&.,/()'_#+]+$")
            .WithMessage("Name contains invalid characters.");
    }
}
