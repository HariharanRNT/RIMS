using System.Text.RegularExpressions;
using FluentValidation;
using RIIMS.Application.DTOs.Employee;

namespace RIIMS.Application.Validators;

public class CreateEmployeeRequestValidator : AbstractValidator<CreateEmployeeRequest>
{
    public CreateEmployeeRequestValidator()
    {
        // 1. Employee Code
        RuleFor(x => x.EmployeeCode)
            .NotEmpty().WithMessage("Employee code is required.")
            .MaximumLength(20).WithMessage("Employee code must be 20 characters or less.")
            .Must(code => !string.IsNullOrWhiteSpace(code) && !code.Contains(" ")).WithMessage("Employee code can contain only letters, numbers, and hyphens.")
            .Matches(@"^[A-Za-z0-9-]{1,20}$").WithMessage("Employee code can contain only letters, numbers, and hyphens.");

        // 2. Full Name
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Full name is required.")
            .MinimumLength(2).WithMessage("Full name must contain at least 2 characters.")
            .MaximumLength(100).WithMessage("Full name must be 100 characters or less.")
            .Matches(@"^[A-Za-z]+(?:[ ]+[A-Za-z]+)*$").WithMessage("Full name can contain only letters and spaces.");

        // 3. Email Address
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email address is required.")
            .MaximumLength(254).WithMessage("Email address must be 254 characters or less.")
            .Must(email => !string.IsNullOrWhiteSpace(email) && !email.Contains(" ")).WithMessage("Email address cannot contain spaces.")
            .Matches(@"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$")
            .WithMessage("Please enter a valid email address.");

        // 4. Primary Phone Number
        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Primary phone number is required.")
            .Must(phone => !string.IsNullOrWhiteSpace(phone) && phone.Trim().StartsWith("+"))
            .WithMessage("Phone number must start with + and include a valid country code.")
            .Must(phone =>
            {
                if (string.IsNullOrWhiteSpace(phone)) return false;
                var normalized = phone.Replace(" ", "");
                return Regex.IsMatch(normalized, @"^\+[1-9]\d{7,14}$");
            }).WithMessage("Please enter a valid international phone number.");

        // 5. Father's Name (Optional)
        RuleFor(x => x.FatherName)
            .MaximumLength(100).WithMessage("Father's name must be 100 characters or less.")
            .Matches(@"^[A-Za-z .']+$").When(x => !string.IsNullOrWhiteSpace(x.FatherName))
            .WithMessage("Please enter a valid father's name.");

        // 6. Mother's Name (Optional)
        RuleFor(x => x.MotherName)
            .MaximumLength(100).WithMessage("Mother's name must be 100 characters or less.")
            .Matches(@"^[A-Za-z .']+$").When(x => !string.IsNullOrWhiteSpace(x.MotherName))
            .WithMessage("Please enter a valid mother's name.");

        // 7. Emergency Contact 1
        RuleFor(x => x.EmergencyContact1)
            .NotEmpty().WithMessage("Emergency contact number 1 is required.")
            .Must(phone => !string.IsNullOrWhiteSpace(phone) && phone.Trim().StartsWith("+"))
            .WithMessage("Please enter the emergency contact with country code.")
            .Must(phone =>
            {
                if (string.IsNullOrWhiteSpace(phone)) return false;
                var normalized = phone.Replace(" ", "");
                return Regex.IsMatch(normalized, @"^\+[1-9]\d{7,14}$");
            }).WithMessage("Please enter a valid international phone number.");

        // 8. Emergency Contact 2 (Optional)
        RuleFor(x => x.EmergencyContact2)
            .Must(phone => string.IsNullOrWhiteSpace(phone) || !phone.Any(char.IsLetter))
            .WithMessage("Emergency contact number 2 cannot contain letters.")
            .Must(phone =>
            {
                if (string.IsNullOrWhiteSpace(phone)) return true;
                var normalized = phone.Replace(" ", "");
                return Regex.IsMatch(normalized, @"^\+[1-9]\d{7,14}$");
            }).When(x => !string.IsNullOrWhiteSpace(x.EmergencyContact2))
            .WithMessage("Please enter a valid international phone number.");

        // 9. Initial Password (Optional)
        When(x => !string.IsNullOrWhiteSpace(x.Password), () =>
        {
            RuleFor(x => x.Password)
                .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
                .MaximumLength(64).WithMessage("Password must be 64 characters or less.")
                .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
                .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter.")
                .Matches(@"\d").WithMessage("Password must contain at least one number.")
                .Matches(@"[^A-Za-z\d]").WithMessage("Password must contain at least one special character.");
        });

        // 10. Department
        RuleFor(x => x.DepartmentId)
            .GreaterThan(0).WithMessage("Please select a department.");

        // 11. Designation
        RuleFor(x => x.DesignationId)
            .GreaterThan(0).WithMessage("Please select a designation.");

        // 12. Date of Joining
        RuleFor(x => x.DateOfJoining)
            .NotEmpty().WithMessage("Date of joining is required.")
            .Must(date => date.Date <= DateTime.UtcNow.Date).WithMessage("Date of joining cannot be in the future.");

        // 13. Statutory Identifiers (PF, PAN, ESI, Aadhaar - Max 25 chars)
        RuleFor(x => x.PfNumber)
            .MaximumLength(25).WithMessage("PF Number must be 25 characters or less.");

        RuleFor(x => x.PanNumber)
            .MaximumLength(25).WithMessage("PAN Number must be 25 characters or less.");

        RuleFor(x => x.EsiNumber)
            .MaximumLength(25).WithMessage("ESI Number must be 25 characters or less.");

        RuleFor(x => x.AadhaarNumber)
            .MaximumLength(25).WithMessage("Aadhaar Number must be 25 characters or less.");
    }
}

public class UpdateEmployeeRequestValidator : AbstractValidator<UpdateEmployeeRequest>
{
    public UpdateEmployeeRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Full name is required.")
            .MinimumLength(2).WithMessage("Full name must contain at least 2 characters.")
            .MaximumLength(100).WithMessage("Full name must be 100 characters or less.")
            .Matches(@"^[A-Za-z]+(?:[ ]+[A-Za-z]+)*$").WithMessage("Full name can contain only letters and spaces.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email address is required.")
            .MaximumLength(254).WithMessage("Email address must be 254 characters or less.")
            .Must(email => !string.IsNullOrWhiteSpace(email) && !email.Contains(" ")).WithMessage("Email address cannot contain spaces.")
            .Matches(@"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$")
            .WithMessage("Please enter a valid email address.");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Primary phone number is required.")
            .Must(phone => !string.IsNullOrWhiteSpace(phone) && phone.Trim().StartsWith("+"))
            .WithMessage("Phone number must start with + and include a valid country code.")
            .Must(phone =>
            {
                if (string.IsNullOrWhiteSpace(phone)) return false;
                var normalized = phone.Replace(" ", "");
                return Regex.IsMatch(normalized, @"^\+[1-9]\d{7,14}$");
            }).WithMessage("Please enter a valid international phone number.");

        RuleFor(x => x.FatherName)
            .MaximumLength(100).WithMessage("Father's name must be 100 characters or less.")
            .Matches(@"^[A-Za-z .']+$").When(x => !string.IsNullOrWhiteSpace(x.FatherName))
            .WithMessage("Please enter a valid father's name.");

        RuleFor(x => x.MotherName)
            .MaximumLength(100).WithMessage("Mother's name must be 100 characters or less.")
            .Matches(@"^[A-Za-z .']+$").When(x => !string.IsNullOrWhiteSpace(x.MotherName))
            .WithMessage("Please enter a valid mother's name.");

        RuleFor(x => x.EmergencyContact1)
            .NotEmpty().WithMessage("Emergency contact number 1 is required.")
            .Must(phone => !string.IsNullOrWhiteSpace(phone) && phone.Trim().StartsWith("+"))
            .WithMessage("Please enter the emergency contact with country code.")
            .Must(phone =>
            {
                if (string.IsNullOrWhiteSpace(phone)) return false;
                var normalized = phone.Replace(" ", "");
                return Regex.IsMatch(normalized, @"^\+[1-9]\d{7,14}$");
            }).WithMessage("Please enter a valid international phone number.");

        RuleFor(x => x.EmergencyContact2)
            .Must(phone => string.IsNullOrWhiteSpace(phone) || !phone.Any(char.IsLetter))
            .WithMessage("Emergency contact number 2 cannot contain letters.")
            .Must(phone =>
            {
                if (string.IsNullOrWhiteSpace(phone)) return true;
                var normalized = phone.Replace(" ", "");
                return Regex.IsMatch(normalized, @"^\+[1-9]\d{7,14}$");
            }).When(x => !string.IsNullOrWhiteSpace(x.EmergencyContact2))
            .WithMessage("Please enter a valid international phone number.");

        RuleFor(x => x.DepartmentId)
            .GreaterThan(0).WithMessage("Please select a department.");

        RuleFor(x => x.DesignationId)
            .GreaterThan(0).WithMessage("Please select a designation.");

        RuleFor(x => x.DateOfJoining)
            .NotEmpty().WithMessage("Date of joining is required.")
            .Must(date => date.Date <= DateTime.UtcNow.Date).WithMessage("Date of joining cannot be in the future.");

        RuleFor(x => x.PfNumber)
            .MaximumLength(25).WithMessage("PF Number must be 25 characters or less.");

        RuleFor(x => x.PanNumber)
            .MaximumLength(25).WithMessage("PAN Number must be 25 characters or less.");

        RuleFor(x => x.EsiNumber)
            .MaximumLength(25).WithMessage("ESI Number must be 25 characters or less.");

        RuleFor(x => x.AadhaarNumber)
            .MaximumLength(25).WithMessage("Aadhaar Number must be 25 characters or less.");
    }
}

public class UpdateWorkDetailRequestValidator : AbstractValidator<UpdateWorkDetailRequest>
{
    public UpdateWorkDetailRequestValidator()
    {
        RuleFor(x => x.ShiftStart).NotEmpty().WithMessage("Shift start time is required.");
        RuleFor(x => x.ShiftEnd).NotEmpty().WithMessage("Shift end time is required.");
        RuleFor(x => x.WorkLocation).NotEmpty().WithMessage("Work location is required.");
        RuleFor(x => x.EmploymentType).NotEmpty().WithMessage("Employment type is required.");
    }
}
