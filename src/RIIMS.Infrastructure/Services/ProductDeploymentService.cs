using ClosedXML.Excel;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.ProductDeployment;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Services;

public class ProductDeploymentService : IProductDeploymentService
{
    private readonly RiimsDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public ProductDeploymentService(
        RiimsDbContext context,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    private async Task<(int employeeId, bool isAdmin, List<int> authorizedProductIds)> ResolveUserAccessAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || !user.IsActive)
        {
            throw new UnauthorizedAccessException("User not found or inactive.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        bool isAdmin = roles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) ||
                       roles.Contains("Admin", StringComparer.OrdinalIgnoreCase);

        int employeeId = user.EmployeeId ?? 0;
        if (employeeId == 0)
        {
            var matchedEmp = await _context.Employees.FirstOrDefaultAsync(e => e.Email == user.Email);
            if (matchedEmp != null)
            {
                employeeId = matchedEmp.Id;
            }
        }

        if (isAdmin)
        {
            var allProductIds = await _context.Products.Where(p => p.IsActive).Select(p => p.Id).ToListAsync();
            return (employeeId, true, allProductIds);
        }

        var assignedProductIds = await _context.EmployeeProductAccesses
            .Where(epa => epa.EmployeeId == employeeId && epa.IsActive && epa.Product.IsActive)
            .Select(epa => epa.ProductId)
            .Distinct()
            .ToListAsync();

        return (employeeId, false, assignedProductIds);
    }

    public async Task<PagedResult<ProductDeploymentDto>> GetDeploymentsAsync(int currentUserId, ProductDeploymentFilter filter)
    {
        var (employeeId, isAdmin, authorizedProductIds) = await ResolveUserAccessAsync(currentUserId);

        if (!isAdmin && (!authorizedProductIds.Any() || employeeId == 0))
        {
            return new PagedResult<ProductDeploymentDto>
            {
                Items = new List<ProductDeploymentDto>(),
                TotalCount = 0,
                Page = filter.Page,
                PageSize = filter.PageSize
            };
        }

        var query = _context.ProductDeploymentHistories
            .Include(d => d.Product)
            .Include(d => d.Client)
            .Include(d => d.CreatedByEmployee)
            .Include(d => d.ModifiedByEmployee)
            .Include(d => d.MovedToTestingByEmployee)
            .Include(d => d.TestingCompletedByEmployee)
            .Include(d => d.DeliveredByEmployee)
            .Include(d => d.Activities)
            .AsQueryable();

        // Enforce product-level access control for non-admin employees
        if (!isAdmin)
        {
            query = query.Where(d => authorizedProductIds.Contains(d.ProductId));
        }

        // Apply filters
        if (filter.ProductId.HasValue && filter.ProductId > 0)
        {
            query = query.Where(d => d.ProductId == filter.ProductId.Value);
        }

        if (filter.ClientId.HasValue && filter.ClientId > 0)
        {
            query = query.Where(d => d.ClientId == filter.ClientId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(d => d.CurrentStatus == filter.Status.Trim());
        }

        if (!string.IsNullOrWhiteSpace(filter.Version))
        {
            query = query.Where(d => d.Version != null && d.Version.Contains(filter.Version.Trim()));
        }

        if (filter.EmployeeId.HasValue && filter.EmployeeId > 0)
        {
            query = query.Where(d => d.CreatedBy == filter.EmployeeId.Value ||
                                     d.ModifiedBy == filter.EmployeeId.Value ||
                                     d.MovedToTestingBy == filter.EmployeeId.Value ||
                                     d.TestingCompletedBy == filter.EmployeeId.Value ||
                                     d.DeliveredBy == filter.EmployeeId.Value);
        }

        if (filter.IssueDateFrom.HasValue)
        {
            var from = filter.IssueDateFrom.Value.Date;
            query = query.Where(d => d.IssueDate >= from);
        }

        if (filter.IssueDateTo.HasValue)
        {
            var to = filter.IssueDateTo.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(d => d.IssueDate <= to);
        }

        if (filter.DeliveryDateFrom.HasValue)
        {
            var from = filter.DeliveryDateFrom.Value.Date;
            query = query.Where(d => d.DeliveryDate.HasValue && d.DeliveryDate.Value >= from);
        }

        if (filter.DeliveryDateTo.HasValue)
        {
            var to = filter.DeliveryDateTo.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(d => d.DeliveryDate.HasValue && d.DeliveryDate.Value <= to);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(d => d.Issue.ToLower().Contains(term) ||
                                     d.Description.ToLower().Contains(term) ||
                                     d.DevelopmentProcess.ToLower().Contains(term) ||
                                     (d.Version != null && d.Version.ToLower().Contains(term)) ||
                                     d.Product.Name.ToLower().Contains(term) ||
                                     d.Client.CompanyName.ToLower().Contains(term) ||
                                     d.Client.CustomerName.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(d => d.UpdatedAt)
            .ThenByDescending(d => d.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return new PagedResult<ProductDeploymentDto>
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize
        };
    }

    public async Task<ProductDeploymentDto?> GetDeploymentByIdAsync(int currentUserId, int id)
    {
        var (employeeId, isAdmin, authorizedProductIds) = await ResolveUserAccessAsync(currentUserId);

        var deployment = await _context.ProductDeploymentHistories
            .Include(d => d.Product)
            .Include(d => d.Client)
            .Include(d => d.CreatedByEmployee)
            .Include(d => d.ModifiedByEmployee)
            .Include(d => d.MovedToTestingByEmployee)
            .Include(d => d.TestingCompletedByEmployee)
            .Include(d => d.DeliveredByEmployee)
            .Include(d => d.Activities)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deployment == null) return null;

        if (!isAdmin && !authorizedProductIds.Contains(deployment.ProductId))
        {
            throw new UnauthorizedAccessException("You are not authorized to view this deployment record.");
        }

        return MapToDto(deployment);
    }

    public async Task<ProductDeploymentDto> CreateDeploymentAsync(int currentUserId, CreateProductDeploymentRequest request)
    {
        var (employeeId, isAdmin, authorizedProductIds) = await ResolveUserAccessAsync(currentUserId);

        if (!isAdmin && !authorizedProductIds.Contains(request.ProductId))
        {
            throw new UnauthorizedAccessException("You are not authorized to create deployment records for this product.");
        }

        // Validate Product exists & active
        var product = await _context.Products.FindAsync(request.ProductId);
        if (product == null || !product.IsActive)
        {
            throw new InvalidOperationException("Selected product does not exist or is inactive.");
        }

        // Validate Client exists & active
        var client = await _context.Clients.FindAsync(request.ClientId);
        if (client == null || !client.IsActive)
        {
            throw new InvalidOperationException("Selected client does not exist or is inactive.");
        }

        // Validate Product-Client Mapping exists
        var mappingExists = await _context.ProductClientMappings
            .AnyAsync(m => m.ProductId == request.ProductId && m.ClientId == request.ClientId && m.IsActive);
        if (!mappingExists)
        {
            throw new InvalidOperationException($"Client '{client.CompanyName}' is not mapped to product '{product.Name}'.");
        }

        var status = string.IsNullOrWhiteSpace(request.CurrentStatus) ? "New" : request.CurrentStatus.Trim();
        var now = DateTime.UtcNow;

        var raisedBy = string.IsNullOrWhiteSpace(request.RaisedBy) ? "Client" : request.RaisedBy.Trim();
        if (raisedBy != "Client" && raisedBy != "Internally Found")
        {
            throw new ArgumentException("Raised By must be either 'Client' or 'Internally Found'.");
        }

        string? modeOfContact = null;
        string? contactedPerson = null;

        if (raisedBy == "Client")
        {
            if (string.IsNullOrWhiteSpace(request.ModeOfContact) || (request.ModeOfContact.Trim() != "Email" && request.ModeOfContact.Trim() != "Call"))
            {
                throw new ArgumentException("Mode of Contact is required and must be 'Email' or 'Call' when Raised By is 'Client'.");
            }
            if (string.IsNullOrWhiteSpace(request.ContactedPerson))
            {
                throw new ArgumentException("Contacted Person is required when Raised By is 'Client'.");
            }
            modeOfContact = request.ModeOfContact.Trim();
            contactedPerson = request.ContactedPerson.Trim();
        }

        var deployment = new ProductDeploymentHistory
        {
            ProductId = request.ProductId,
            ClientId = request.ClientId,
            Issue = string.IsNullOrWhiteSpace(request.Issue) ? string.Empty : request.Issue.Trim(),
            IssueDate = request.IssueDate,
            RaisedBy = raisedBy,
            ModeOfContact = modeOfContact,
            ContactedPerson = contactedPerson,
            Description = request.Description.Trim(),
            DevelopmentProcess = string.IsNullOrWhiteSpace(request.DevelopmentProcess) ? string.Empty : request.DevelopmentProcess.Trim(),
            CurrentStatus = status,
            Version = string.IsNullOrWhiteSpace(request.Version) ? null : request.Version.Trim(),
            DeliveryDate = request.DeliveryDate,
            CreatedBy = employeeId > 0 ? employeeId : (int?)null,
            ModifiedBy = employeeId > 0 ? employeeId : (int?)null,
            CreatedAt = now,
            UpdatedAt = now
        };

        // Handle lifecycle status on creation
        if (status == "Moved to Testing" || status == "Testing In Progress")
        {
            deployment.MovedToTesting = true;
            deployment.MovedToTestingBy = employeeId > 0 ? employeeId : (int?)null;
            deployment.MovedToTestingAt = now;
        }
        else if (status == "Testing Completed" || status == "Ready for Delivery")
        {
            deployment.MovedToTesting = true;
            deployment.MovedToTestingBy = employeeId > 0 ? employeeId : (int?)null;
            deployment.MovedToTestingAt = now;
            deployment.TestingCompleted = true;
            deployment.TestingCompletedBy = employeeId > 0 ? employeeId : (int?)null;
            deployment.TestingCompletedAt = now;
        }
        else if (status == "Delivered")
        {
            deployment.MovedToTesting = true;
            deployment.TestingCompleted = true;
            deployment.DeliveredBy = employeeId > 0 ? employeeId : (int?)null;
            deployment.DeliveredAt = now;
            deployment.DeliveryDate ??= now.Date;
        }

        _context.ProductDeploymentHistories.Add(deployment);
        await _context.SaveChangesAsync();

        // Add Creation Activity
        var activity = new ProductDeploymentActivity
        {
            DeploymentId = deployment.Id,
            ActionType = "Created",
            PreviousStatus = null,
            NewStatus = status,
            Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? "Deployment record created" : request.Remarks.Trim(),
            ChangedBy = employeeId > 0 ? employeeId : 1,
            ChangedAt = now
        };

        _context.ProductDeploymentActivities.Add(activity);
        await _context.SaveChangesAsync();

        return (await GetDeploymentByIdAsync(currentUserId, deployment.Id))!;
    }

    public async Task<ProductDeploymentDto> UpdateDeploymentAsync(int currentUserId, int id, UpdateProductDeploymentRequest request)
    {
        var (employeeId, isAdmin, authorizedProductIds) = await ResolveUserAccessAsync(currentUserId);

        var deployment = await _context.ProductDeploymentHistories
            .Include(d => d.Product)
            .Include(d => d.Client)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deployment == null)
            throw new KeyNotFoundException($"Deployment record with ID {id} not found.");

        if (!isAdmin && !authorizedProductIds.Contains(deployment.ProductId))
        {
            throw new UnauthorizedAccessException("You are not authorized to update this deployment record.");
        }

        if (!isAdmin && !authorizedProductIds.Contains(request.ProductId))
        {
            throw new UnauthorizedAccessException("You cannot change this deployment to an unauthorized product.");
        }

        // Validate Product & Client & Mapping
        var product = await _context.Products.FindAsync(request.ProductId);
        if (product == null || !product.IsActive)
            throw new InvalidOperationException("Selected product does not exist or is inactive.");

        var client = await _context.Clients.FindAsync(request.ClientId);
        if (client == null || !client.IsActive)
            throw new InvalidOperationException("Selected client does not exist or is inactive.");

        var mappingExists = await _context.ProductClientMappings
            .AnyAsync(m => m.ProductId == request.ProductId && m.ClientId == request.ClientId && m.IsActive);
        if (!mappingExists)
            throw new InvalidOperationException($"Client '{client.CompanyName}' is not mapped to product '{product.Name}'.");

        var previousStatus = deployment.CurrentStatus;
        var newStatus = request.CurrentStatus.Trim();
        var now = DateTime.UtcNow;
        var isStatusChanging = !string.Equals(previousStatus, newStatus, StringComparison.OrdinalIgnoreCase);

        string actionType = isStatusChanging ? "Status Changed" : "Updated";

        // Check for Reopened transition
        bool isReopening = isStatusChanging &&
            (previousStatus == "Moved to Testing" || previousStatus == "Testing In Progress" ||
             previousStatus == "Testing Completed" || previousStatus == "Ready for Delivery" ||
             previousStatus == "Delivered") &&
            (newStatus == "Development In Progress" || newStatus == "New");

        if (isReopening)
        {
            if (string.IsNullOrWhiteSpace(request.Remarks))
            {
                throw new ArgumentException("Remarks are required when reopening a deployment back to development.");
            }
            actionType = "Reopened";
            deployment.MovedToTesting = false;
            deployment.TestingCompleted = false;
        }
        else if (isStatusChanging)
        {
            if (newStatus == "Moved to Testing" || newStatus == "Testing In Progress")
            {
                actionType = newStatus == "Testing In Progress" ? "Testing Started" : "Moved to Testing";
                deployment.MovedToTesting = true;
                deployment.MovedToTestingBy = employeeId > 0 ? employeeId : deployment.MovedToTestingBy;
                deployment.MovedToTestingAt = now;
            }
            else if (newStatus == "Testing Completed")
            {
                actionType = "Testing Completed";
                deployment.MovedToTesting = true;
                deployment.TestingCompleted = true;
                deployment.TestingCompletedBy = employeeId > 0 ? employeeId : deployment.TestingCompletedBy;
                deployment.TestingCompletedAt = now;
            }
            else if (newStatus == "Delivered")
            {
                actionType = "Delivered";
                deployment.DeliveredBy = employeeId > 0 ? employeeId : deployment.DeliveredBy;
                deployment.DeliveredAt = now;
                deployment.DeliveryDate = request.DeliveryDate ?? deployment.DeliveryDate ?? now.Date;
            }
            else if (newStatus == "On Hold")
            {
                actionType = "Put On Hold";
            }
        }
        else
        {
            if (!string.Equals(deployment.Version, request.Version?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                actionType = "Version Updated";
            }
            else if (deployment.DeliveryDate != request.DeliveryDate)
            {
                actionType = "Delivery Date Updated";
            }
        }

        var raisedBy = string.IsNullOrWhiteSpace(request.RaisedBy) ? "Client" : request.RaisedBy.Trim();
        if (raisedBy != "Client" && raisedBy != "Internally Found")
        {
            throw new ArgumentException("Raised By must be either 'Client' or 'Internally Found'.");
        }

        string? modeOfContact = null;
        string? contactedPerson = null;

        if (raisedBy == "Client")
        {
            if (string.IsNullOrWhiteSpace(request.ModeOfContact) || (request.ModeOfContact.Trim() != "Email" && request.ModeOfContact.Trim() != "Call"))
            {
                throw new ArgumentException("Mode of Contact is required and must be 'Email' or 'Call' when Raised By is 'Client'.");
            }
            if (string.IsNullOrWhiteSpace(request.ContactedPerson))
            {
                throw new ArgumentException("Contacted Person is required when Raised By is 'Client'.");
            }
            modeOfContact = request.ModeOfContact.Trim();
            contactedPerson = request.ContactedPerson.Trim();
        }

        deployment.ProductId = request.ProductId;
        deployment.ClientId = request.ClientId;
        deployment.Issue = string.IsNullOrWhiteSpace(request.Issue) ? string.Empty : request.Issue.Trim();
        deployment.IssueDate = request.IssueDate;
        deployment.RaisedBy = raisedBy;
        deployment.ModeOfContact = modeOfContact;
        deployment.ContactedPerson = contactedPerson;
        deployment.Description = request.Description.Trim();
        deployment.DevelopmentProcess = string.IsNullOrWhiteSpace(request.DevelopmentProcess) ? string.Empty : request.DevelopmentProcess.Trim();
        deployment.CurrentStatus = newStatus;
        deployment.Version = string.IsNullOrWhiteSpace(request.Version) ? null : request.Version.Trim();
        deployment.DeliveryDate = request.DeliveryDate;
        deployment.ModifiedBy = employeeId > 0 ? employeeId : (int?)null;
        deployment.UpdatedAt = now;

        _context.ProductDeploymentHistories.Update(deployment);

        // Record Activity
        var activity = new ProductDeploymentActivity
        {
            DeploymentId = deployment.Id,
            ActionType = actionType,
            PreviousStatus = previousStatus,
            NewStatus = newStatus,
            Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? $"Updated by {(isAdmin ? "Administrator" : "Employee")}" : request.Remarks.Trim(),
            ChangedBy = employeeId > 0 ? employeeId : 1,
            ChangedAt = now
        };

        _context.ProductDeploymentActivities.Add(activity);
        await _context.SaveChangesAsync();

        return (await GetDeploymentByIdAsync(currentUserId, deployment.Id))!;
    }

    public async Task<ProductDeploymentDto> ChangeStatusAsync(int currentUserId, int id, ChangeDeploymentStatusRequest request)
    {
        var (employeeId, isAdmin, authorizedProductIds) = await ResolveUserAccessAsync(currentUserId);

        var deployment = await _context.ProductDeploymentHistories
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deployment == null)
            throw new KeyNotFoundException($"Deployment record with ID {id} not found.");

        if (!isAdmin && !authorizedProductIds.Contains(deployment.ProductId))
        {
            throw new UnauthorizedAccessException("You are not authorized to update this deployment record.");
        }

        var previousStatus = deployment.CurrentStatus;
        var newStatus = request.NewStatus.Trim();
        var now = DateTime.UtcNow;

        string actionType = "Status Changed";

        bool isReopening =
            (previousStatus == "Moved to Testing" || previousStatus == "Testing In Progress" ||
             previousStatus == "Testing Completed" || previousStatus == "Ready for Delivery" ||
             previousStatus == "Delivered") &&
            (newStatus == "Development In Progress" || newStatus == "New");

        if (isReopening)
        {
            if (string.IsNullOrWhiteSpace(request.Remarks))
            {
                throw new ArgumentException("Remarks are required when reopening a deployment back to development.");
            }
            actionType = "Reopened";
            deployment.MovedToTesting = false;
            deployment.TestingCompleted = false;
        }
        else
        {
            if (newStatus == "Moved to Testing")
            {
                actionType = "Moved to Testing";
                deployment.MovedToTesting = true;
                deployment.MovedToTestingBy = employeeId > 0 ? employeeId : deployment.MovedToTestingBy;
                deployment.MovedToTestingAt = now;
            }
            else if (newStatus == "Testing In Progress")
            {
                actionType = "Testing Started";
                deployment.MovedToTesting = true;
                deployment.MovedToTestingBy ??= employeeId > 0 ? employeeId : (int?)null;
                deployment.MovedToTestingAt ??= now;
            }
            else if (newStatus == "Testing Completed")
            {
                actionType = "Testing Completed";
                deployment.MovedToTesting = true;
                deployment.TestingCompleted = true;
                deployment.TestingCompletedBy = employeeId > 0 ? employeeId : deployment.TestingCompletedBy;
                deployment.TestingCompletedAt = now;
            }
            else if (newStatus == "Delivered")
            {
                actionType = "Delivered";
                deployment.DeliveredBy = employeeId > 0 ? employeeId : deployment.DeliveredBy;
                deployment.DeliveredAt = now;
                deployment.DeliveryDate = request.DeliveryDate ?? deployment.DeliveryDate ?? now.Date;
            }
            else if (newStatus == "On Hold")
            {
                actionType = "Put On Hold";
            }
        }

        deployment.CurrentStatus = newStatus;
        if (!string.IsNullOrWhiteSpace(request.Version))
        {
            deployment.Version = request.Version.Trim();
        }
        if (request.DeliveryDate.HasValue)
        {
            deployment.DeliveryDate = request.DeliveryDate.Value;
        }

        deployment.ModifiedBy = employeeId > 0 ? employeeId : (int?)null;
        deployment.UpdatedAt = now;

        _context.ProductDeploymentHistories.Update(deployment);

        var activity = new ProductDeploymentActivity
        {
            DeploymentId = deployment.Id,
            ActionType = actionType,
            PreviousStatus = previousStatus,
            NewStatus = newStatus,
            Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? $"Status changed from {previousStatus} to {newStatus}" : request.Remarks.Trim(),
            ChangedBy = employeeId > 0 ? employeeId : 1,
            ChangedAt = now
        };

        _context.ProductDeploymentActivities.Add(activity);
        await _context.SaveChangesAsync();

        return (await GetDeploymentByIdAsync(currentUserId, deployment.Id))!;
    }

    public async Task<List<ProductDeploymentActivityDto>> GetActivitiesAsync(int currentUserId, int deploymentId)
    {
        var (employeeId, isAdmin, authorizedProductIds) = await ResolveUserAccessAsync(currentUserId);

        var deployment = await _context.ProductDeploymentHistories.FindAsync(deploymentId);
        if (deployment == null)
            throw new KeyNotFoundException($"Deployment with ID {deploymentId} not found.");

        if (!isAdmin && !authorizedProductIds.Contains(deployment.ProductId))
        {
            throw new UnauthorizedAccessException("You are not authorized to view activities for this deployment record.");
        }

        var activities = await _context.ProductDeploymentActivities
            .Include(a => a.ChangedByEmployee)
            .Where(a => a.DeploymentId == deploymentId)
            .OrderByDescending(a => a.ChangedAt)
            .ToListAsync();

        return activities.Select(a => new ProductDeploymentActivityDto
        {
            Id = a.Id,
            DeploymentId = a.DeploymentId,
            ActionType = a.ActionType,
            PreviousStatus = a.PreviousStatus,
            NewStatus = a.NewStatus,
            Remarks = a.Remarks,
            ChangedBy = a.ChangedBy,
            ChangedByName = a.ChangedByEmployee?.Name ?? $"Employee #{a.ChangedBy}",
            ChangedAt = a.ChangedAt
        }).ToList();
    }

    public async Task<byte[]> ExportToExcelAsync(int currentUserId, ProductDeploymentFilter filter)
    {
        var (employeeId, isAdmin, authorizedProductIds) = await ResolveUserAccessAsync(currentUserId);

        var query = _context.ProductDeploymentHistories
            .Include(d => d.Product)
            .Include(d => d.Client)
            .Include(d => d.CreatedByEmployee)
            .Include(d => d.ModifiedByEmployee)
            .Include(d => d.MovedToTestingByEmployee)
            .Include(d => d.TestingCompletedByEmployee)
            .Include(d => d.DeliveredByEmployee)
            .Include(d => d.Activities)
                .ThenInclude(a => a.ChangedByEmployee)
            .AsQueryable();

        if (!isAdmin)
        {
            query = query.Where(d => authorizedProductIds.Contains(d.ProductId));
        }

        if (filter.ProductId.HasValue && filter.ProductId > 0)
        {
            query = query.Where(d => d.ProductId == filter.ProductId.Value);
        }

        if (filter.ClientId.HasValue && filter.ClientId > 0)
        {
            query = query.Where(d => d.ClientId == filter.ClientId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(d => d.CurrentStatus == filter.Status.Trim());
        }

        if (!string.IsNullOrWhiteSpace(filter.Version))
        {
            query = query.Where(d => d.Version != null && d.Version.Contains(filter.Version.Trim()));
        }

        if (filter.IssueDateFrom.HasValue)
        {
            query = query.Where(d => d.IssueDate >= filter.IssueDateFrom.Value.Date);
        }

        if (filter.IssueDateTo.HasValue)
        {
            query = query.Where(d => d.IssueDate <= filter.IssueDateTo.Value.Date.AddDays(1).AddTicks(-1));
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(d => d.Issue.ToLower().Contains(term) ||
                                     d.Description.ToLower().Contains(term) ||
                                     d.DevelopmentProcess.ToLower().Contains(term) ||
                                     (d.Version != null && d.Version.ToLower().Contains(term)) ||
                                     d.Product.Name.ToLower().Contains(term) ||
                                     d.Client.CompanyName.ToLower().Contains(term));
        }

        var deployments = await query
            .OrderByDescending(d => d.UpdatedAt)
            .ToListAsync();

        using var workbook = new XLWorkbook();

        // ----------------------------------------------------
        // Sheet 1: Deployment History (Exact 20 columns)
        // ----------------------------------------------------
        var sheet1 = workbook.Worksheets.Add("Deployment History");

        var sheet1Headers = new[]
        {
            "Product", "Client", "Issue", "Issue Date",
            "Raised By", "Mode of Contact", "Contacted Person",
            "Description", "Development Process",
            "Current Status", "Moved to Testing", "Moved to Testing By", "Moved to Testing Date & Time",
            "Testing Completed", "Testing Completed By", "Testing Completed Date & Time",
            "Delivery Date", "Delivered By", "Version", "Created By", "Created Date & Time",
            "Last Modified By", "Last Modified Date & Time"
        };

        for (int i = 0; i < sheet1Headers.Length; i++)
        {
            var cell = sheet1.Cell(1, i + 1);
            cell.Value = sheet1Headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A"); // Dark Blue Header
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        int row1 = 2;
        foreach (var d in deployments)
        {
            sheet1.Cell(row1, 1).Value = d.Product?.Name ?? string.Empty;
            sheet1.Cell(row1, 2).Value = d.Client?.CompanyName ?? string.Empty;
            sheet1.Cell(row1, 3).Value = d.Issue;
            sheet1.Cell(row1, 4).Value = d.IssueDate.ToString("yyyy-MM-dd");
            sheet1.Cell(row1, 5).Value = d.RaisedBy ?? "Client";
            sheet1.Cell(row1, 6).Value = (d.RaisedBy == "Internally Found") ? string.Empty : (d.ModeOfContact ?? string.Empty);
            sheet1.Cell(row1, 7).Value = (d.RaisedBy == "Internally Found") ? string.Empty : (d.ContactedPerson ?? string.Empty);
            sheet1.Cell(row1, 8).Value = d.Description;
            sheet1.Cell(row1, 9).Value = d.DevelopmentProcess;
            sheet1.Cell(row1, 10).Value = d.CurrentStatus;
            sheet1.Cell(row1, 11).Value = d.MovedToTesting ? "Yes" : "No";
            sheet1.Cell(row1, 12).Value = d.MovedToTestingByEmployee?.Name ?? (d.MovedToTesting ? $"Employee #{d.MovedToTestingBy}" : "-");
            sheet1.Cell(row1, 13).Value = d.MovedToTestingAt?.ToString("yyyy-MM-dd HH:mm") ?? "-";
            sheet1.Cell(row1, 14).Value = d.TestingCompleted ? "Yes" : "No";
            sheet1.Cell(row1, 15).Value = d.TestingCompletedByEmployee?.Name ?? (d.TestingCompleted ? $"Employee #{d.TestingCompletedBy}" : "-");
            sheet1.Cell(row1, 16).Value = d.TestingCompletedAt?.ToString("yyyy-MM-dd HH:mm") ?? "-";
            sheet1.Cell(row1, 17).Value = d.DeliveryDate?.ToString("yyyy-MM-dd") ?? "-";
            sheet1.Cell(row1, 18).Value = d.DeliveredByEmployee?.Name ?? (d.DeliveredBy.HasValue ? $"Employee #{d.DeliveredBy}" : "-");
            sheet1.Cell(row1, 19).Value = d.Version ?? "-";
            sheet1.Cell(row1, 20).Value = d.CreatedByEmployee?.Name ?? $"Employee #{d.CreatedBy}";
            sheet1.Cell(row1, 21).Value = d.CreatedAt.ToString("yyyy-MM-dd HH:mm");
            sheet1.Cell(row1, 22).Value = d.ModifiedByEmployee?.Name ?? $"Employee #{d.ModifiedBy}";
            sheet1.Cell(row1, 23).Value = d.UpdatedAt.ToString("yyyy-MM-dd HH:mm");

            // Zebra striping
            if (row1 % 2 == 1)
            {
                sheet1.Row(row1).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
            }

            row1++;
        }

        sheet1.Columns().AdjustToContents(10, 60);

        // ----------------------------------------------------
        // Sheet 2: Activity History (Exact 10 columns)
        // ----------------------------------------------------
        var sheet2 = workbook.Worksheets.Add("Activity History");

        var sheet2Headers = new[]
        {
            "Deployment ID", "Product", "Client", "Issue", "Action", "Previous Status",
            "New Status", "Remarks", "Changed By", "Changed Date & Time"
        };

        for (int i = 0; i < sheet2Headers.Length; i++)
        {
            var cell = sheet2.Cell(1, i + 1);
            cell.Value = sheet2Headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0F766E"); // Teal Header
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        int row2 = 2;
        foreach (var d in deployments)
        {
            var activities = d.Activities.OrderByDescending(a => a.ChangedAt).ToList();
            foreach (var a in activities)
            {
                sheet2.Cell(row2, 1).Value = d.Id;
                sheet2.Cell(row2, 2).Value = d.Product?.Name ?? string.Empty;
                sheet2.Cell(row2, 3).Value = d.Client?.CompanyName ?? string.Empty;
                sheet2.Cell(row2, 4).Value = d.Issue;
                sheet2.Cell(row2, 5).Value = a.ActionType;
                sheet2.Cell(row2, 6).Value = a.PreviousStatus ?? "-";
                sheet2.Cell(row2, 7).Value = a.NewStatus ?? "-";
                sheet2.Cell(row2, 8).Value = a.Remarks ?? "-";
                sheet2.Cell(row2, 9).Value = a.ChangedByEmployee?.Name ?? $"Employee #{a.ChangedBy}";
                sheet2.Cell(row2, 10).Value = a.ChangedAt.ToString("yyyy-MM-dd HH:mm");

                if (row2 % 2 == 1)
                {
                    sheet2.Row(row2).Style.Fill.BackgroundColor = XLColor.FromHtml("#F0FDFA");
                }

                row2++;
            }
        }

        sheet2.Columns().AdjustToContents(10, 60);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<List<AuthorizedProductOptionDto>> GetAuthorizedProductsAndClientsAsync(int currentUserId)
    {
        var (employeeId, isAdmin, authorizedProductIds) = await ResolveUserAccessAsync(currentUserId);

        var productsQuery = _context.Products
            .Include(p => p.ProductClientMappings)
                .ThenInclude(m => m.Client)
            .Where(p => p.IsActive);

        if (!isAdmin)
        {
            productsQuery = productsQuery.Where(p => authorizedProductIds.Contains(p.Id));
        }

        var products = await productsQuery.OrderBy(p => p.Name).ToListAsync();

        return products.Select(p => new AuthorizedProductOptionDto
        {
            ProductId = p.Id,
            ProductName = p.Name,
            ProductCode = p.Code,
            MappedClients = p.ProductClientMappings
                .Where(m => m.IsActive && m.Client.IsActive)
                .Select(m => new AuthorizedClientOptionDto
                {
                    ClientId = m.ClientId,
                    CompanyName = m.Client.CompanyName,
                    CustomerName = m.Client.CustomerName
                })
                .OrderBy(c => c.CompanyName)
                .ToList()
        }).ToList();
    }

    public async Task<List<EmployeeProductAccessDto>> GetEmployeeProductAccessListAsync()
    {
        var employees = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Designation)
            .Where(e => e.IsActive)
            .OrderBy(e => e.Name)
            .ToListAsync();

        var accesses = await _context.EmployeeProductAccesses
            .Include(epa => epa.Product)
            .Where(epa => epa.IsActive)
            .ToListAsync();

        var accessGroup = accesses.GroupBy(a => a.EmployeeId).ToDictionary(g => g.Key, g => g.ToList());

        return employees.Select(e =>
        {
            var empAccess = accessGroup.TryGetValue(e.Id, out var accList) ? accList : new List<EmployeeProductAccess>();
            var productIds = empAccess.Select(a => a.ProductId).ToList();
            var productNames = empAccess.Select(a => a.Product.Name).ToList();

            return new EmployeeProductAccessDto
            {
                EmployeeId = e.Id,
                EmployeeCode = e.EmployeeCode,
                EmployeeName = e.Name,
                Email = e.Email,
                DepartmentName = e.Department?.Name ?? "-",
                DesignationName = e.Designation?.Name ?? "-",
                HasPermission = productIds.Any(),
                AssignedProductIds = productIds,
                AssignedProductNames = productNames
            };
        }).ToList();
    }

    public async Task<EmployeeProductAccessDto> UpdateEmployeeProductAccessAsync(UpdateEmployeeProductAccessRequest request, int currentUserId)
    {
        var employee = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Designation)
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId);

        if (employee == null)
            throw new KeyNotFoundException($"Employee with ID {request.EmployeeId} not found.");

        var existingAccesses = await _context.EmployeeProductAccesses
            .Where(epa => epa.EmployeeId == request.EmployeeId)
            .ToListAsync();

        if (!request.HasPermission || request.AssignedProductIds == null || !request.AssignedProductIds.Any())
        {
            // Deactivate all accesses
            foreach (var acc in existingAccesses)
            {
                acc.IsActive = false;
                acc.UpdatedAt = DateTime.UtcNow;
            }
        }
        else
        {
            var requestedProductIds = request.AssignedProductIds.Distinct().ToList();

            // Deactivate removed ones
            foreach (var acc in existingAccesses.Where(a => !requestedProductIds.Contains(a.ProductId)))
            {
                acc.IsActive = false;
                acc.UpdatedAt = DateTime.UtcNow;
            }

            // Reactivate or create added ones
            foreach (var pid in requestedProductIds)
            {
                var existing = existingAccesses.FirstOrDefault(a => a.ProductId == pid);
                if (existing != null)
                {
                    existing.IsActive = true;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.EmployeeProductAccesses.Add(new EmployeeProductAccess
                    {
                        EmployeeId = request.EmployeeId,
                        ProductId = pid,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        await _context.SaveChangesAsync();

        var updatedList = await GetEmployeeProductAccessListAsync();
        return updatedList.First(x => x.EmployeeId == request.EmployeeId);
    }

    private static ProductDeploymentDto MapToDto(ProductDeploymentHistory d)
    {
        return new ProductDeploymentDto
        {
            Id = d.Id,
            ProductId = d.ProductId,
            ProductName = d.Product?.Name ?? string.Empty,
            ProductCode = d.Product?.Code ?? string.Empty,
            ClientId = d.ClientId,
            ClientCompanyName = d.Client?.CompanyName ?? string.Empty,
            ClientCustomerName = d.Client?.CustomerName ?? string.Empty,
            Issue = d.Issue,
            IssueDate = d.IssueDate,
            RaisedBy = d.RaisedBy ?? "Client",
            ModeOfContact = d.ModeOfContact,
            ContactedPerson = d.ContactedPerson,
            Description = d.Description,
            DevelopmentProcess = d.DevelopmentProcess,
            CurrentStatus = d.CurrentStatus,
            MovedToTesting = d.MovedToTesting,
            MovedToTestingBy = d.MovedToTestingBy,
            MovedToTestingByName = d.MovedToTestingByEmployee?.Name,
            MovedToTestingAt = d.MovedToTestingAt,
            TestingCompleted = d.TestingCompleted,
            TestingCompletedBy = d.TestingCompletedBy,
            TestingCompletedByName = d.TestingCompletedByEmployee?.Name,
            TestingCompletedAt = d.TestingCompletedAt,
            DeliveryDate = d.DeliveryDate,
            DeliveredBy = d.DeliveredBy,
            DeliveredByName = d.DeliveredByEmployee?.Name,
            DeliveredAt = d.DeliveredAt,
            Version = d.Version,
            CreatedBy = d.CreatedBy,
            CreatedByName = d.CreatedByEmployee?.Name,
            CreatedAt = d.CreatedAt,
            ModifiedBy = d.ModifiedBy,
            ModifiedByName = d.ModifiedByEmployee?.Name,
            UpdatedAt = d.UpdatedAt,
            IsActive = d.IsActive,
            ActivitiesCount = d.Activities?.Count ?? 0
        };
    }
}
