# Phase 1 Implementation Plan — Foundation

> **Scope:** Auth, roles, Employee master, Department/Designation masters, lookup tables, SystemSettings, Attendance login/logout, IIS deployment pipeline — proven end-to-end.

---

## Proposed Changes

### Step 1 — Solution Scaffolding

Create the .NET solution and all 5 backend projects with correct inter-project references, plus the React frontend app.

#### [NEW] [RIIMS.sln](file:///d:/Hariharan/G-Project/RIIMS%20V2/RIIMS.sln)
Solution file referencing all 5 projects.

#### [NEW] src/RIIMS.Domain/RIIMS.Domain.csproj
- Class library, no dependencies.
- Target: `net8.0`

#### [NEW] src/RIIMS.Application/RIIMS.Application.csproj
- Class library → references `RIIMS.Domain`.
- NuGet: `FluentValidation`, `FluentValidation.DependencyInjectionExtensions`

#### [NEW] src/RIIMS.Infrastructure/RIIMS.Infrastructure.csproj
- Class library → references `RIIMS.Domain`, `RIIMS.Application`.
- NuGet: `Microsoft.EntityFrameworkCore.SqlServer`, `Microsoft.AspNetCore.Identity.EntityFrameworkCore`

#### [NEW] src/RIIMS.API/RIIMS.API.csproj
- Web API → references `RIIMS.Application`, `RIIMS.Infrastructure`, `RIIMS.Jobs`.
- NuGet: `Microsoft.AspNetCore.Authentication.JwtBearer`, `Swashbuckle.AspNetCore`
- Set `<AspNetCoreHostingModel>InProcess</AspNetCoreHostingModel>`

#### [NEW] src/RIIMS.Jobs/RIIMS.Jobs.csproj
- Class library → references `RIIMS.Application`, `RIIMS.Infrastructure`.
- NuGet: `Hangfire.Core`, `Hangfire.SqlServer`

#### [NEW] frontend/
- Scaffold via `npx create-vite` with React + TypeScript template.
- Install: `react-router-dom`, `axios`

---

### Step 2 — Domain Entities & Enums

All entities inherit from a `BaseEntity` with shared audit columns.

#### [NEW] src/RIIMS.Domain/Common/BaseEntity.cs
```csharp
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? CreatedBy { get; set; }
    public bool IsActive { get; set; } = true;
}
```

#### [NEW] src/RIIMS.Domain/Entities/
| File | Key Fields |
|------|-----------|
| `Department.cs` | Name (unique) |
| `Designation.cs` | Name (unique) |
| `Employee.cs` | EmployeeCode (UK), Name, Email (UK), Phone, DepartmentId FK, DesignationId FK, ReportingPersonId FK (nullable self-ref), DateOfJoining |
| `EmployeeWorkDetail.cs` | EmployeeId FK, ShiftStart (TimeSpan), ShiftEnd (TimeSpan), WorkLocation, EmploymentType |
| `Product.cs` | Name, Code (unique) |
| `Client.cs` | CompanyName, CustomerName, Address fields, PAN (UK), GSTNo (UK), HSN, CIN (UK) |
| `ProductClientMapping.cs` | ProductId FK, ClientId FK (composite unique) |
| `BreakType.cs` | Name (unique) |
| `SupportActivityType.cs` | Name (unique) |
| `LeaveType.cs` | Name (unique) |
| `AttendanceLog.cs` | EmployeeId FK, LoginTime, LogoutTime (nullable) |
| `SystemSetting.cs` | Key (unique), Value, Description |
| `Task.cs` | EmployeeId FK, ProductId FK, ClientId FK, ModuleName, Description, Status |
| `TaskTimeLog.cs` | TaskId FK, StartTime, EndTime (nullable) |
| `BreakLog.cs` | EmployeeId FK, BreakTypeId FK, HeldTaskId FK (nullable), StartTime, EndTime (nullable) |
| `SupportActivityLog.cs` | EmployeeId FK, ActivityTypeId FK, HeldTaskId FK (nullable), ProductId FK (nullable), ClientId FK (nullable), Remarks, StartTime, EndTime (nullable) |
| `ActivityTimeline.cs` | EmployeeId FK, ActivityType, RefTable, RefId, StartTime, EndTime, Status, Remarks |

> [!NOTE]
> All entities for later phases (Task, TaskTimeLog, BreakLog, SupportActivityLog, ActivityTimeline, etc.) are **created as domain entities now** but their services/controllers/screens are built in their respective phases. This ensures the DbContext and migrations cover the full schema from the start.

#### [NEW] src/RIIMS.Domain/Enums/
| File | Values |
|------|--------|
| `TaskStatus.cs` | Running, OnHold, Completed |
| `RequestStatus.cs` | Pending, Approved, Rejected |
| `WorkLocation.cs` | Office, Remote, Hybrid |
| `EmploymentType.cs` | FullTime, PartTime, Contract |

---

### Step 3 — Infrastructure (DbContext, EF Config, Repositories)

#### [NEW] src/RIIMS.Infrastructure/Data/RiimsDbContext.cs
- Extends `IdentityDbContext<ApplicationUser, IdentityRole<int>, int>`
- DbSets for all entities.
- `SaveChangesAsync` override: auto-set `CreatedAt`/`UpdatedAt`.

#### [NEW] src/RIIMS.Infrastructure/Data/Configurations/
EF Core `IEntityTypeConfiguration<T>` for each entity — indexes, unique constraints, FK relationships, enum conversions.

| File | Key Config |
|------|-----------|
| `EmployeeConfiguration.cs` | Unique indexes on Email, EmployeeCode; self-referencing FK on ReportingPersonId; FK to Department, Designation |
| `ProductClientMappingConfiguration.cs` | Composite unique on (ProductId, ClientId) |
| `AttendanceLogConfiguration.cs` | Composite index on (EmployeeId, LoginTime) |
| `TaskConfiguration.cs` | Index on (EmployeeId, Status); enum conversion for Status |
| `SystemSettingConfiguration.cs` | Unique index on Key |
| `ClientConfiguration.cs` | Unique indexes on PAN, GSTNo, CIN |
| *(+ one per entity)* | |

#### [NEW] src/RIIMS.Infrastructure/Data/ApplicationUser.cs
```csharp
public class ApplicationUser : IdentityUser<int>
{
    public int? EmployeeId { get; set; }
    public bool MustChangePassword { get; set; } = true;
    public Employee? Employee { get; set; }
}
```

#### [NEW] src/RIIMS.Infrastructure/Repositories/
- `IRepository<T>` generic interface (in `RIIMS.Application/Interfaces/`)
- `Repository<T>` implementation with soft-delete filtering (`IsActive == true` global query filter)
- Specific repositories only where custom queries are needed.

#### [NEW] Initial EF Migration
```
dotnet ef migrations add InitialCreate -p src/RIIMS.Infrastructure -s src/RIIMS.API
```

---

### Step 4 — Application Layer (DTOs, Services, Validators)

#### [NEW] src/RIIMS.Application/Common/
| File | Purpose |
|------|---------|
| `ApiResponse.cs` | `ApiResponse<T> { Success, Data, Message, Errors }` envelope |
| `PagedResult.cs` | `PagedResult<T> { Items, TotalCount, Page, PageSize }` |
| `ICurrentUserService.cs` | Interface to get current user's ID and role from JWT claims |

#### [NEW] src/RIIMS.Application/Interfaces/
| File | Purpose |
|------|---------|
| `IRepository.cs` | Generic repository interface |
| `IAuthService.cs` | Login, ChangePassword |
| `IDepartmentService.cs` | CRUD |
| `IDesignationService.cs` | CRUD |
| `IEmployeeService.cs` | CRUD + work details |
| `IAttendanceService.cs` | Login, Logout, Query |
| `ISystemSettingService.cs` | Get, Update |
| `IEmailService.cs` | SendEmail |
| `ILookupService.cs` | CRUD for BreakType, SupportActivityType, LeaveType |

#### [NEW] src/RIIMS.Application/DTOs/
Organized by module:

| Folder | DTOs |
|--------|------|
| `Auth/` | `LoginRequest`, `LoginResponse`, `ChangePasswordRequest` |
| `Department/` | `DepartmentDto`, `CreateDepartmentRequest`, `UpdateDepartmentRequest` |
| `Designation/` | `DesignationDto`, `CreateDesignationRequest`, `UpdateDesignationRequest` |
| `Employee/` | `EmployeeDto`, `EmployeeListDto`, `CreateEmployeeRequest`, `UpdateEmployeeRequest`, `EmployeeWorkDetailDto`, `UpdateWorkDetailRequest` |
| `Attendance/` | `AttendanceDto` |
| `Settings/` | `SystemSettingDto`, `UpdateSettingRequest` |
| `Lookup/` | `LookupDto`, `CreateLookupRequest` |

#### [NEW] src/RIIMS.Application/Validators/
FluentValidation validators for every write DTO:

| File | Key Rules |
|------|-----------|
| `CreateEmployeeValidator.cs` | Email format, required fields, EmployeeCode format |
| `CreateDepartmentValidator.cs` | Name required, max length |
| `LoginRequestValidator.cs` | Email + password required |
| `ChangePasswordValidator.cs` | Current + new password required, min length |
| *(+ one per write DTO)* | |

#### [NEW] src/RIIMS.Application/Services/
| File | Key Logic |
|------|-----------|
| `AuthService.cs` | Identity login, JWT generation, MustChangePassword check, ChangePassword |
| `DepartmentService.cs` | Standard CRUD with soft delete |
| `DesignationService.cs` | Standard CRUD with soft delete |
| `EmployeeService.cs` | CRUD + create Identity user + generate temp password + trigger email + work details management |
| `AttendanceService.cs` | Login (create AttendanceLog), Logout (close AttendanceLog + auto-hold tasks + auto-close breaks/support + write ActivityTimeline) |
| `SystemSettingService.cs` | Get all, Get by key, Update |
| `EmailService.cs` | SMTP email sending |
| `LookupService.cs` | Generic CRUD for BreakType, SupportActivityType, LeaveType |

---

### Step 5 — API Layer (Controllers, Middleware, Program.cs)

#### [NEW] src/RIIMS.API/Program.cs
- Configure services: DbContext, Identity, JWT auth, FluentValidation, Swagger, Hangfire, CORS (none needed), DI registration.
- Configure middleware pipeline: global exception handler → auth → routing → Swagger → endpoints.

#### [NEW] src/RIIMS.API/Middleware/GlobalExceptionMiddleware.cs
- Catches all unhandled exceptions.
- Returns `{ success: false, message: "...", errors: [...] }` envelope.
- Logs to console/file.

#### [NEW] src/RIIMS.API/Controllers/
| Controller | Endpoints | Auth |
|-----------|-----------|------|
| `AuthController.cs` | `POST login` (public), `POST change-password` | Public / Authenticated |
| `DepartmentsController.cs` | GET, POST, PUT, DELETE | Admin |
| `DesignationsController.cs` | GET, POST, PUT, DELETE | Admin |
| `EmployeesController.cs` | GET (paged), POST, PUT, GET/PUT work-details | Admin |
| `AttendanceController.cs` | POST login, POST logout, GET by employee+date | Authenticated |
| `SystemSettingsController.cs` | GET, PUT | Admin |
| `BreakTypesController.cs` | GET, POST, PUT, DELETE | Admin |
| `SupportActivityTypesController.cs` | GET, POST, PUT, DELETE | Admin |
| `LeaveTypesController.cs` | GET, POST, PUT, DELETE | Admin |

#### [NEW] src/RIIMS.API/appsettings.json / appsettings.Development.json
- Connection string, JWT settings (key, issuer, audience, expiry), SMTP settings.

---

### Step 6 — Database Seed Data

#### [NEW] src/RIIMS.Infrastructure/Data/DataSeeder.cs

Seed on first run:
| Table | Seed Data |
|-------|-----------|
| Roles | `Admin`, `Employee` |
| SystemSettings | `GraceMinutes = 15` |
| BreakType | Bio Break, Tea Break, Lunch Break |
| SupportActivityType | Support Call, Call, Meeting, Discussion, Demo |
| LeaveType | Casual Leave, Sick Leave, Earned Leave |
| Admin User | Default admin account (email from appsettings) |

---

### Step 7 — Frontend Scaffolding & Auth

#### [NEW] frontend/src/api/client.ts
- Axios instance with `baseURL: '/api'`.
- Request interceptor: attach JWT from storage.
- Response interceptor: handle 401 → redirect to login.

#### [NEW] frontend/src/contexts/AuthContext.tsx
- React context providing: `user`, `login()`, `logout()`, `isAuthenticated`, `role`, `mustChangePassword`.

#### [NEW] frontend/src/pages/auth/
| File | Purpose |
|------|---------|
| `LoginPage.tsx` | Email + password form, calls `/api/auth/login`, stores JWT, redirects based on role |
| `ChangePasswordPage.tsx` | Current + new password form, required on first login |

#### [NEW] frontend/src/components/layout/
| File | Purpose |
|------|---------|
| `AdminLayout.tsx` | Sidebar + top bar + content area for Admin portal |
| `EmployeeLayout.tsx` | Sidebar + top bar + content area for Employee portal |
| `Sidebar.tsx` | Navigation sidebar with role-based menu items |
| `ProtectedRoute.tsx` | Route guard checking auth + role + mustChangePassword |

#### [NEW] frontend/src/App.tsx
- React Router setup with protected routes.
- Admin routes: `/admin/dashboard`, `/admin/employees`, `/admin/departments`, `/admin/designations`, `/admin/products`, `/admin/clients`, `/admin/mappings`, `/admin/leave-approvals`, `/admin/permission-approvals`, `/admin/break-types`, `/admin/support-activity-types`, `/admin/leave-types`, `/admin/settings`, `/admin/reports`
- Employee routes: `/dashboard`, `/work-task`, `/leave`, `/permission`, `/payslip`

---

### Step 8 — Frontend Admin Screens (Phase 1)

#### [NEW] frontend/src/pages/admin/employees/
| File | Purpose |
|------|---------|
| `EmployeeListPage.tsx` | Data table with search, department filter, pagination, [+ New Employee] button |
| `EmployeeFormModal.tsx` | 3-tab modal: Registration, Reporting Person, Work Details |

#### [NEW] frontend/src/pages/admin/departments/
| File | Purpose |
|------|---------|
| `DepartmentListPage.tsx` | Data table + [+ New] modal form |

#### [NEW] frontend/src/pages/admin/designations/
| File | Purpose |
|------|---------|
| `DesignationListPage.tsx` | Data table + [+ New] modal form |

#### [NEW] frontend/src/pages/admin/settings/
| File | Purpose |
|------|---------|
| `SystemSettingsPage.tsx` | Key-value settings editor (GraceMinutes, etc.) |

#### [NEW] frontend/src/pages/admin/lookups/
| File | Purpose |
|------|---------|
| `BreakTypesPage.tsx` | CRUD table for break types |
| `SupportActivityTypesPage.tsx` | CRUD table for support activity types |
| `LeaveTypesPage.tsx` | CRUD table for leave types |

---

### Step 9 — Frontend Employee Screens (Phase 1 — Minimal)

#### [NEW] frontend/src/pages/employee/
| File | Purpose |
|------|---------|
| `DashboardPage.tsx` | Placeholder with today's attendance status card (login time, live status) — full dashboard in Phase 5 |

---

### Step 10 — IIS Deployment Config

#### [NEW] frontend/public/web.config
```xml
<!-- URL Rewrite: fallback all non-/api routes to index.html for SPA -->
<rewrite>
  <rules>
    <rule name="SPA" stopProcessing="true">
      <match url=".*" />
      <conditions>
        <add input="{REQUEST_URI}" pattern="^/api" negate="true" />
        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
      </conditions>
      <action type="Rewrite" url="/index.html" />
    </rule>
  </rules>
</rewrite>
```

#### [MODIFY] src/RIIMS.API/RIIMS.API.csproj
- Ensure `<AspNetCoreHostingModel>InProcess</AspNetCoreHostingModel>`.

---

## Verification Plan

### Automated Tests
```bash
# Build the solution
dotnet build RIIMS.sln

# Run EF migrations against a local SQL Server
dotnet ef database update -p src/RIIMS.Infrastructure -s src/RIIMS.API

# Verify API starts and Swagger loads
dotnet run --project src/RIIMS.API
# → Browse to https://localhost:5001/swagger

# Frontend build
cd frontend && npm run build
```

### Manual Verification
| # | Test | Expected |
|---|------|----------|
| 1 | Swagger loads at `/api/swagger` | All Phase 1 endpoints visible |
| 2 | Login with seeded admin | JWT returned, role = Admin |
| 3 | Create Department via API | 201, department in DB |
| 4 | Create Employee via API | Employee + Identity user created, temp password emailed |
| 5 | Employee first login | JWT returned with `mustChangePassword: true` |
| 6 | Change password | Success, `MustChangePassword` → false |
| 7 | Employee login (after password change) | AttendanceLog created with LoginTime |
| 8 | Employee logout | AttendanceLog.LogoutTime set |
| 9 | SystemSettings GET | Returns `GraceMinutes: 15` |
| 10 | Frontend login page | Renders, authenticates, redirects by role |
| 11 | Admin employee list | Loads, displays employees with pagination |
| 12 | Soft delete a department | `IsActive = 0`, disappears from active list |

---

## File Count Estimate

| Layer | Estimated Files |
|-------|----------------|
| Domain (entities + enums) | ~20 |
| Infrastructure (DbContext + configs + repos) | ~20 |
| Application (DTOs + services + validators) | ~30 |
| API (controllers + middleware + config) | ~15 |
| Frontend (pages + components + api) | ~25 |
| **Total** | **~110 files** |

---

## Out of Scope (Future Phases)

| Phase | Modules |
|-------|---------|
| **Phase 2** | Task engine, Break engine, Support Activity engine, ActivityTimeline service |
| **Phase 3** | Leave requests, Permission requests, Approval workflows |
| **Phase 4** | Grace-time tracking, LOP calculation, Payslip generation |
| **Phase 5** | Employee dashboard (full), Admin dashboard, Monthly Excel report job |
| **Phase 6** | IIS production hardening, load testing, UAT |
