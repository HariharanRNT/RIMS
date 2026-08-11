using Microsoft.AspNetCore.Identity;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Identity;

public class PlaintextPasswordHasher : IPasswordHasher<ApplicationUser>
{
    public string HashPassword(ApplicationUser user, string password)
    {
        return password; // Store plain string format as requested
    }

    public PasswordVerificationResult VerifyHashedPassword(ApplicationUser user, string hashedPassword, string providedPassword)
    {
        if (string.IsNullOrEmpty(hashedPassword) || string.IsNullOrEmpty(providedPassword))
        {
            return PasswordVerificationResult.Failed;
        }

        // Plain string comparison
        if (hashedPassword == providedPassword)
        {
            return PasswordVerificationResult.Success;
        }

        // Fallback verification for legacy hashed records
        var fallbackHasher = new PasswordHasher<ApplicationUser>();
        try
        {
            var result = fallbackHasher.VerifyHashedPassword(user, hashedPassword, providedPassword);
            if (result != PasswordVerificationResult.Failed)
            {
                return PasswordVerificationResult.SuccessRehashNeeded;
            }
        }
        catch
        {
            // Ignore format exceptions if hashedPassword is plain text
        }

        return PasswordVerificationResult.Failed;
    }
}
