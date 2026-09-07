using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Settings;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Services;
using Xunit;

namespace RIIMS.Tests;

public class SystemSettingNotificationTests
{
    private RiimsDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new RiimsDbContext(options);
    }

    [Fact]
    public async Task GetIdleNotificationSettings_ReturnsDefaults_WhenNoSettingsInDb()
    {
        using var context = CreateInMemoryContext();
        var service = new SystemSettingService(context);

        var result = await service.GetIdleNotificationSettingsAsync();

        Assert.True(result.IdleNotificationEnabled);
        Assert.Equal(5, result.IdleThresholdMinutes);
        Assert.Equal(5, result.IdleRepeatIntervalMinutes);
    }

    [Fact]
    public async Task GetIdleNotificationSettings_ReturnsPersistedValues()
    {
        using var context = CreateInMemoryContext();
        context.SystemSettings.AddRange(
            new SystemSetting { Key = "IdleNotificationEnabled", Value = "false", IsActive = true },
            new SystemSetting { Key = "IdleThresholdMinutes", Value = "10", IsActive = true },
            new SystemSetting { Key = "IdleRepeatIntervalMinutes", Value = "8", IsActive = true }
        );
        await context.SaveChangesAsync();

        var service = new SystemSettingService(context);
        var result = await service.GetIdleNotificationSettingsAsync();

        Assert.False(result.IdleNotificationEnabled);
        Assert.Equal(10, result.IdleThresholdMinutes);
        Assert.Equal(8, result.IdleRepeatIntervalMinutes);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-5")]
    [InlineData("abc")]
    public async Task UpdateAsync_InvalidIdleThreshold_ThrowsArgumentException(string invalidValue)
    {
        using var context = CreateInMemoryContext();
        context.SystemSettings.Add(new SystemSetting { Key = "IdleThresholdMinutes", Value = "5", IsActive = true });
        await context.SaveChangesAsync();

        var service = new SystemSettingService(context);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateAsync("IdleThresholdMinutes", new UpdateSettingRequest { Value = invalidValue })
        );
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-2")]
    [InlineData("xyz")]
    public async Task UpdateAsync_InvalidIdleRepeatInterval_ThrowsArgumentException(string invalidValue)
    {
        using var context = CreateInMemoryContext();
        context.SystemSettings.Add(new SystemSetting { Key = "IdleRepeatIntervalMinutes", Value = "5", IsActive = true });
        await context.SaveChangesAsync();

        var service = new SystemSettingService(context);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateAsync("IdleRepeatIntervalMinutes", new UpdateSettingRequest { Value = invalidValue })
        );
    }

    [Fact]
    public async Task UpdateAsync_InvalidIdleNotificationEnabled_ThrowsArgumentException()
    {
        using var context = CreateInMemoryContext();
        context.SystemSettings.Add(new SystemSetting { Key = "IdleNotificationEnabled", Value = "true", IsActive = true });
        await context.SaveChangesAsync();

        var service = new SystemSettingService(context);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateAsync("IdleNotificationEnabled", new UpdateSettingRequest { Value = "notabool" })
        );
    }

    [Fact]
    public async Task UpdateAsync_CreatesNewSetting_WhenKeyNotInDb()
    {
        using var context = CreateInMemoryContext();
        var service = new SystemSettingService(context);

        var result = await service.UpdateAsync("IdleThresholdMinutes", new UpdateSettingRequest { Value = "2" });

        Assert.NotNull(result);
        Assert.Equal("IdleThresholdMinutes", result.Key);
        Assert.Equal("2", result.Value);

        var settingInDb = await context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "IdleThresholdMinutes");
        Assert.NotNull(settingInDb);
        Assert.Equal("2", settingInDb.Value);
    }
}
