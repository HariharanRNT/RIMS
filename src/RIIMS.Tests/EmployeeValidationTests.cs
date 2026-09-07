using FluentValidation.TestHelper;
using RIIMS.Application.DTOs.Employee;
using RIIMS.Application.Validators;
using Xunit;

namespace RIIMS.Tests;

public class EmployeeValidationTests
{
    private readonly CreateEmployeeRequestValidator _createValidator;
    private readonly UpdateEmployeeRequestValidator _updateValidator;

    public EmployeeValidationTests()
    {
        _createValidator = new CreateEmployeeRequestValidator();
        _updateValidator = new UpdateEmployeeRequestValidator();
    }

    [Fact]
    public void CreateEmployee_FutureDateOfBirth_ShouldHaveValidationError()
    {
        var request = new CreateEmployeeRequest
        {
            DateOfBirth = DateTime.UtcNow.AddDays(1)
        };

        var result = _createValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.DateOfBirth)
            .WithErrorMessage("Date of birth cannot be in the future.");
    }

    [Fact]
    public void CreateEmployee_UnderageDateOfBirth_ShouldHaveValidationError()
    {
        var request = new CreateEmployeeRequest
        {
            DateOfBirth = DateTime.UtcNow.AddYears(-17)
        };

        var result = _createValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.DateOfBirth)
            .WithErrorMessage("Employee must be at least 18 years old.");
    }

    [Fact]
    public void CreateEmployee_Over75YearsDateOfBirth_ShouldHaveValidationError()
    {
        var request = new CreateEmployeeRequest
        {
            DateOfBirth = DateTime.UtcNow.AddYears(-76)
        };

        var result = _createValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.DateOfBirth)
            .WithErrorMessage("Employee age cannot exceed 75 years.");
    }

    [Fact]
    public void CreateEmployee_ValidDateOfBirth_ShouldNotHaveDateOfBirthValidationError()
    {
        var request = new CreateEmployeeRequest
        {
            DateOfBirth = DateTime.UtcNow.AddYears(-25)
        };

        var result = _createValidator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.DateOfBirth);
    }

    [Fact]
    public void CreateEmployee_NullDateOfBirth_ShouldNotHaveDateOfBirthValidationError()
    {
        var request = new CreateEmployeeRequest
        {
            DateOfBirth = null
        };

        var result = _createValidator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.DateOfBirth);
    }

    [Fact]
    public void UpdateEmployee_FutureDateOfBirth_ShouldHaveValidationError()
    {
        var request = new UpdateEmployeeRequest
        {
            DateOfBirth = DateTime.UtcNow.AddDays(10)
        };

        var result = _updateValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.DateOfBirth)
            .WithErrorMessage("Date of birth cannot be in the future.");
    }

    [Fact]
    public void UpdateEmployee_UnderageDateOfBirth_ShouldHaveValidationError()
    {
        var request = new UpdateEmployeeRequest
        {
            DateOfBirth = DateTime.UtcNow.AddYears(-15)
        };

        var result = _updateValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.DateOfBirth)
            .WithErrorMessage("Employee must be at least 18 years old.");
    }
}
