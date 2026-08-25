using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Client;
using RIIMS.Application.Exceptions;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class ClientService : IClientService
{
    private readonly IRepository<Client> _repository;
    private readonly RiimsDbContext _context;

    public ClientService(IRepository<Client> repository, RiimsDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    public async Task<List<ClientDto>> GetAllAsync()
    {
        var items = await _repository.GetAllAsync();
        return items.Select(MapToDto).ToList();
    }

    public async Task<ClientDto?> GetByIdAsync(int id)
    {
        var c = await _repository.GetByIdAsync(id);
        if (c == null) return null;
        return MapToDto(c);
    }

    public async Task<ClientDto> CreateAsync(CreateClientRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.PAN))
        {
            if (await _repository.ExistsAsync(c => c.PAN == request.PAN.Trim().ToUpperInvariant()))
                throw new InvalidOperationException($"Client with PAN '{request.PAN}' already exists.");
        }
        if (!string.IsNullOrWhiteSpace(request.GSTNo))
        {
            if (await _repository.ExistsAsync(c => c.GSTNo == request.GSTNo.Trim().ToUpperInvariant()))
                throw new InvalidOperationException($"Client with GST '{request.GSTNo}' already exists.");
        }

        var client = new Client
        {
            CompanyName = request.CompanyName,
            CustomerName = request.CustomerName,
            AddressLine1 = request.AddressLine1,
            AddressLine2 = request.AddressLine2,
            Country = request.Country,
            State = request.State,
            City = request.City,
            Pincode = request.Pincode,
            PAN = request.PAN?.Trim().ToUpperInvariant(),
            GSTNo = request.GSTNo?.Trim().ToUpperInvariant(),
            HSN = request.HSN,
            CIN = request.CIN?.Trim().ToUpperInvariant()
        };

        await _repository.AddAsync(client);
        return MapToDto(client);
    }

    public async Task<ClientDto> UpdateAsync(int id, UpdateClientRequest request)
    {
        var client = await _repository.GetByIdAsync(id);
        if (client == null)
            throw new KeyNotFoundException($"Client with ID {id} not found.");

        if (!string.IsNullOrWhiteSpace(request.PAN))
        {
            var panUpper = request.PAN.Trim().ToUpperInvariant();
            if (await _repository.ExistsAsync(c => c.PAN == panUpper && c.Id != id))
                throw new InvalidOperationException($"Client with PAN '{request.PAN}' already exists.");
            client.PAN = panUpper;
        }

        if (!string.IsNullOrWhiteSpace(request.GSTNo))
        {
            var gstUpper = request.GSTNo.Trim().ToUpperInvariant();
            if (await _repository.ExistsAsync(c => c.GSTNo == gstUpper && c.Id != id))
                throw new InvalidOperationException($"Client with GST '{request.GSTNo}' already exists.");
            client.GSTNo = gstUpper;
        }

        client.CompanyName = request.CompanyName;
        client.CustomerName = request.CustomerName;
        client.AddressLine1 = request.AddressLine1;
        client.AddressLine2 = request.AddressLine2;
        client.Country = request.Country;
        client.State = request.State;
        client.City = request.City;
        client.Pincode = request.Pincode;
        client.HSN = request.HSN;
        client.CIN = request.CIN?.Trim().ToUpperInvariant();

        await _repository.UpdateAsync(client);
        return MapToDto(client);
    }

    public async Task DeleteAsync(int id)
    {
        var client = await _repository.GetByIdAsync(id);
        if (client == null)
            throw new KeyNotFoundException($"Client with ID {id} not found.");

        var mappingCount = await _context.ProductClientMappings.CountAsync(m => m.ClientId == id);
        var demoCount = await _context.DemoFollowUps.CountAsync(d => d.ClientId == id);
        var logCount = await _context.SupportActivityLogs.CountAsync(s => s.ClientId == id);

        if (mappingCount > 0 || demoCount > 0 || logCount > 0)
        {
            throw new ConflictException("Cannot delete this client — it is currently referenced by product mappings, demo follow-ups, or activity logs. Please remove those associations first.");
        }

        await _repository.SoftDeleteAsync(id);
    }

    private static ClientDto MapToDto(Client c) => new()
    {
        Id = c.Id,
        CompanyName = c.CompanyName,
        CustomerName = c.CustomerName,
        AddressLine1 = c.AddressLine1,
        AddressLine2 = c.AddressLine2,
        Country = c.Country,
        State = c.State,
        City = c.City,
        Pincode = c.Pincode,
        PAN = c.PAN,
        GSTNo = c.GSTNo,
        HSN = c.HSN,
        CIN = c.CIN,
        IsActive = c.IsActive
    };
}
