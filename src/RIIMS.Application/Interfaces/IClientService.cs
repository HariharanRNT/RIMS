using RIIMS.Application.DTOs.Client;

namespace RIIMS.Application.Interfaces;

public interface IClientService
{
    Task<List<ClientDto>> GetAllAsync();
    Task<ClientDto?> GetByIdAsync(int id);
    Task<ClientDto> CreateAsync(CreateClientRequest request);
    Task<ClientDto> UpdateAsync(int id, UpdateClientRequest request);
    Task DeleteAsync(int id);
}
