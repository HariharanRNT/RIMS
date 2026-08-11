using FluentValidation;
using RIIMS.Application.DTOs.Leave;
using RIIMS.Application.DTOs.Permission;

namespace RIIMS.Application.Validators;

public class CreateLeaveRequestValidator : AbstractValidator<CreateLeaveRequest>
{
    public CreateLeaveRequestValidator()
    {
        RuleFor(x => x.LeaveTypeId).GreaterThan(0).WithMessage("Leave type is required.");
        RuleFor(x => x.FromDate).NotEmpty().WithMessage("From Date is required.");
        RuleFor(x => x.ToDate).NotEmpty().WithMessage("To Date is required.");
        RuleFor(x => x.ToDate)
            .GreaterThanOrEqualTo(x => x.FromDate)
            .WithMessage("To Date must be on or after From Date.");
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

public class CreatePermissionRequestValidator : AbstractValidator<CreatePermissionRequest>
{
    public CreatePermissionRequestValidator()
    {
        RuleFor(x => x.RequestDate).NotEmpty().WithMessage("Request Date is required.");
        RuleFor(x => x.FromTime).NotEmpty().WithMessage("From Time is required.");
        RuleFor(x => x.ToTime).NotEmpty().WithMessage("To Time is required.");
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}
