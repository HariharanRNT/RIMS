using System;
using RIIMS.Domain.Enums;

namespace RIIMS.Application.DTOs.Task;

public class TeamTaskQueryDto
{
    private int _page = 1;
    private int _pageSize = 25;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value switch
        {
            <= 0 => 25,
            > 100 => 100,
            _ => value
        };
    }

    public int? EmployeeId { get; set; }
    public string? Status { get; set; }
    public TaskPriority? Priority { get; set; }
    public string? Search { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; } // "asc" or "desc"
    public string? SmartView { get; set; }
}
