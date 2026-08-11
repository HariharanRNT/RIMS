using RIIMS.Application.DTOs.Lookup;

namespace RIIMS.Application.Interfaces;

public interface ILookupService<T> where T : class
{
    Task<List<LookupDto>> GetAllAsync();
    Task<LookupDto?> GetByIdAsync(int id);
    Task<LookupDto> CreateAsync(CreateLookupRequest request);
    Task<LookupDto> UpdateAsync(int id, UpdateLookupRequest request);
    Task DeleteAsync(int id);
}
