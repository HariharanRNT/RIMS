# Employee-Level Adversarial Security Assessment Report

**Target System:** RIIMS (Resource & Integrated Information Management System) V2  
**Assessed Identity Context:** Normal Authenticated Employee (Standard User without Administrative / HR / Managerial Privileges)  
**Assessment Standard:** OWASP Top 10 API Security Risks (2023), OWASP ASVS v4.0, NIST SP 800-115  
**Assessment Mode:** Source-Code Adversarial Penetration Testing & API Authorization Audit  
**Assessment Date:** 2026-08-26  
**Classification:** Internal Confidential / Defensive Security Audit  

---

## Executive Summary

An authorized **employee-level adversarial penetration testing assessment** of the **RIIMS V2** web application was conducted. The assessment simulated realistic threat scenarios where a malicious or curious internal actor possessing only a valid standard **Employee account** (no Admin, HR Admin, Employee Admin, Payroll Admin, database, or server access) attempts to bypass access controls, perform privilege escalation, exploit Insecure Direct Object References (IDOR/BOLA), tamper with requests, manipulate approval workflows, access unauthorized employee records, and breach data integrity.

### Key Assessment Takeaways:
1. **Critical Function-Level Authorization Bypass in Task Management (`Task.View` Granularity)**:
   - In `DataSeeder.cs` (line 265), the permission `"Task.View"` was seeded directly to the default `Employee` role.
   - Because `[RequirePermission("Task.View")]` guards the administrative endpoint `GET /api/tasks/admin-all`, any standard Employee can directly query and extract **all tasks, module assignments, instructions, and statuses across every employee, manager, and department in the entire organization**.
   - Furthermore, IDOR checks on `GET /api/tasks/active/{employeeId}`, `GET /api/tasks/history/{employeeId}`, and `GET /api/tasks/assigned/{employeeId}` evaluate `!HasPermissionAsync("Task.View")`. Since employees hold `Task.View`, these IDOR guards are completely bypassed, enabling unrestricted task surveillance across all staff.
2. **High Severity Hierarchy Bypass in Task Assignment (`POST /api/tasks/assign`)**:
   - `TasksController.Assign` is accessible to all employees.
   - Inside `TaskService.AssignTaskAsync`, the check to ensure the target employee reports to the assigner was omitted (`targetEmployee.ReportingPersonId == currentUserId` is missing). As a result, **any normal employee can assign tasks to any peer, manager, or executive in the company**, automatically triggering official company notification emails.
3. **Master Data Exposure (`GET /api/clients`, `GET /api/products`, `GET /api/mappings`)**:
   - The master data lookup endpoints possess only base `[Authorize]` without `[RequirePermission("MasterData.View")]`, allowing standard employees to dump the company's full commercial client directory (names, contacts, emails, phones).
4. **Strong Security Baselines Observed**:
   - Core administrative controllers (`UsersController`, `RolesController`, `AppPermissionsController`, `PayrollController`, `SettingsController`, `DepartmentsController`, `DesignationsController`, `EmployeesController` CRUD, `CelebrationController` trigger) rigorously enforce `[RequirePermission]` and role-based policies, returning **`401/403`**.
   - Financial (Payroll & Salary Structure), Attendance, and Leave IDOR controls strictly validate ownership against the authenticated token claims (`_currentUser.EmployeeId`).
   - Anti-Mass Assignment, SQL Injection (EF Core Parameterization), and Session Revocation Middleware successfully withstood adversarial tampering.

---

## 1. Employee Attack Surface

The following matrix documents all API endpoints exposed to an authenticated user holding the `Employee` role:

| Module / Controller | Endpoint Path | Method | Expected Privilege | Test Outcome |
| :--- | :--- | :---: | :--- | :--- |
| **Auth** | `/api/auth/me` | `GET` | Self Profile | **PASS** (Returns authenticated user's own profile) |
| **Auth** | `/api/auth/change-password` | `POST` | Self Identity | **PASS** (Validates current password and updates self) |
| **Attendance** | `/api/attendance/login` | `POST` | Self Identity | **PASS** (Derived from token claims; idempotent) |
| **Attendance** | `/api/attendance/logout` | `POST` | Self Identity | **PASS** (Derived from token claims) |
| **Attendance** | `/api/attendance/{employeeId}` | `GET` | Self / Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Attendance** | `/api/attendance/permission-summary/{employeeId}` | `GET` | Self / Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Attendance Calendar** | `/api/attendance-calendar/{year}/{month}` | `GET` | All Workforce | **PASS** (Read-only company calendar schedule) |
| **Attendance Calendar** | `/api/attendance-calendar/employee/{year}/{month}` | `GET` | Self / Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Attendance Calendar** | `/api/attendance-calendar/employee/{year}/{month}/report` | `GET` | Self / Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Leaves** | `/api/leaves/submit` | `POST` | Self Identity | **PASS** (Derives employee ID from token; sets status `Pending`) |
| **Leaves** | `/api/leaves/my-requests/{employeeId}` | `GET` | Self / HR | **PASS** (IDOR guarded: 403 on other employees) |
| **Leaves** | `/api/leaves/pending-approvals` | `GET` | Reporting Line / HR | **PASS** (Scoped to direct reportees if non-admin) |
| **Permissions** | `/api/permissions/submit` | `POST` | Self Identity | **PASS** (Derives employee ID from token; sets status `Pending`) |
| **Permissions** | `/api/permissions/my-requests/{employeeId}` | `GET` | Self / HR | **PASS** (IDOR guarded: 403 on other employees) |
| **Permissions** | `/api/permissions/pending-approvals` | `GET` | Reporting Line / HR | **PASS** (Scoped to direct reportees if non-admin) |
| **Payroll** | `/api/payroll/payslip/{employeeId}` | `GET` | Self / Payroll Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Payroll** | `/api/payroll/my-payslips/{employeeId}` | `GET` | Self / Payroll Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Salary Structure** | `/api/employees/{employeeId}/salary-structure` | `GET` | Self / Payroll Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Salary Structure** | `/api/employees/{employeeId}/salary-history` | `GET` | Self / Payroll Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Employee Master** | `/api/employees/profile` | `GET` | Self Identity | **PASS** (Returns authenticated employee profile) |
| **Employee Master** | `/api/employees/{id}` | `GET` | Self / Employee Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Employee Master** | `/api/employees/{id}/work-details` | `GET` | Self / Employee Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Tasks** | `/api/tasks/start` | `POST` | Self Identity | **PASS** (Starts self-task, auto-holds running tasks) |
| **Tasks** | `/api/tasks/{id}/start-assigned` | `POST` | Self Identity | **PASS** (Starts assigned task) |
| **Tasks** | `/api/tasks/{id}/hold`, `resume`, `complete` | `POST` | Self Identity | **PASS** (Ownership verified on `t.EmployeeId == employeeId`) |
| **Tasks** | `/api/tasks/active/{employeeId}` | `GET` | Self Identity | **FAIL (IDOR / BOLA)** (Bypassed via seeded `Task.View`) |
| **Tasks** | `/api/tasks/history/{employeeId}` | `GET` | Self Identity | **FAIL (IDOR / BOLA)** (Bypassed via seeded `Task.View`) |
| **Tasks** | `/api/tasks/assigned/{employeeId}` | `GET` | Self Identity | **FAIL (IDOR / BOLA)** (Bypassed via seeded `Task.View`) |
| **Tasks** | `/api/tasks/admin-all` | `GET` | Task Admin / Admin | **FAIL (Admin Access Bypass)** (Bypassed via seeded `Task.View`) |
| **Tasks** | `/api/tasks/assign` | `POST` | Reporting Line / Admin | **FAIL (Authorization Bypass)** (Hierarchy check missing) |
| **Tasks** | `/api/tasks/{id}/timeline` | `GET` | Self / Task Admin | **FAIL (BOLA)** (Evaluates Employee as Admin due to `Task.View`) |
| **Breaks** | `/api/breaks/start`, `/{id}/stop` | `POST` | Self Identity | **PASS** (Ownership verified) |
| **Breaks** | `/api/breaks/active/{employeeId}` | `GET` | Self / Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Support Activity** | `/api/support/start`, `/{id}/stop`, `demo/complete` | `POST` | Self Identity | **PASS** (Ownership verified) |
| **Support Activity** | `/api/support/active/{employeeId}` | `GET` | Self / Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Timeline** | `/api/timeline/{employeeId}` | `GET` | Self / Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Reports** | `/api/reports/employee-dashboard/{employeeId}` | `GET` | Self / Report Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Reports** | `/api/reports/daily-production` | `GET` | Self / Report Admin | **PASS** (Forcibly overrides `employeeId` to caller ID) |
| **Reports** | `/api/reports/daily-detail/{employeeId}` | `GET` | Self / Report Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Reports** | `/api/reports/employee-attendance-breakdown/{employeeId}` | `GET` | Self / Report Admin | **PASS** (IDOR guarded: 403 on other employees) |
| **Celebrations** | `/api/celebration/today` | `GET` | All Workforce | **PASS** (Public company birthday/anniversary feed) |
| **Sessions & Idle** | `/api/sessions/heartbeat`, `/api/idle/current-state` | `POST`/`GET` | Self Identity | **PASS** (Scoped to current session / user) |
| **Lookups (Clients/Products)**| `/api/clients`, `/api/products`, `/api/mappings` | `GET` | MasterData Admin | **FAIL (Data Exposure)** (Lacks permission restriction) |

---

## 2. Adversarial Test Scenarios (1 through 20)

```text
================================================================================
SCENARIO 1: Employee → Admin Access Bypass
================================================================================
Test: Direct API invocation of Admin Dashboard, HR, User, Role, Settings, and Task Admin APIs
Status: FAIL (Partial Breach)
Severity: HIGH
Affected Endpoint: GET /api/tasks/admin-all
Attack Type: Administrative Authorization Bypass / RBAC Over-Privilege
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Log in with normal Employee credentials to obtain a valid JWT token.
2. Send HTTP GET request to /api/tasks/admin-all:
   GET /api/tasks/admin-all HTTP/1.1
   Host: target-api
   Authorization: Bearer <employee_jwt_token>
3. Send HTTP GET request to /api/users, /api/roles, /api/settings, and /api/payroll/summary for comparison.

Expected Security Behavior:
Employee must receive 403 Forbidden for all administrative endpoints.

Actual Behavior:
- /api/users, /api/roles, /api/settings, /api/payroll/summary correctly return 403 Forbidden.
- /api/tasks/admin-all returns 200 OK with the entire organization's task dataset across all employees, departments, and managers.

Security Impact:
Confidential corporate workload data, ongoing internal project names, module details, priority levels, and employee task performance metrics are exposed to all rank-and-file employees.

Root Cause:
In DataSeeder.cs (line 265), the permission "Task.View" is seeded to the "Employee" role. In TasksController.cs (line 132), GetAdminTasks is annotated with [RequirePermission("Task.View")].

Recommended Fix:
1. Remove "Task.View" from the default "Employee" role in DataSeeder.cs.
2. Protect GetAdminTasks with [RequirePermission("Task.Manage", "Task.Admin")].
```

```text
================================================================================
SCENARIO 2: Employee → Another Employee's Data (IDOR / BOLA)
================================================================================
Test: Accessing Employee B's Attendance, Leaves, Permissions, Payslips, Salary, Profile, and Tasks
Status: FAIL (Task Module BOLA); PASS (All other modules)
Severity: HIGH
Affected Endpoint: 
  - GET /api/tasks/active/{employeeId}
  - GET /api/tasks/history/{employeeId}
  - GET /api/tasks/assigned/{employeeId}
  - GET /api/tasks/{id}/timeline
Attack Type: Insecure Direct Object References (IDOR / BOLA)
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. As Employee A (ID: 2), issue a request for Employee B's (ID: 3) active tasks:
   GET /api/tasks/active/3 HTTP/1.1
   Authorization: Bearer <employee_A_jwt_token>
2. Issue requests to GET /api/tasks/history/3 and GET /api/tasks/assigned/3.
3. Query task timeline for a task ID belonging to Employee B:
   GET /api/tasks/15/timeline HTTP/1.1
   Authorization: Bearer <employee_A_jwt_token>

Expected Security Behavior:
Employee A receives 403 Forbidden when requesting Employee B's records.

Actual Behavior:
- Attendance, Leaves, Permissions, Payslips, Salary Structure, and Profile endpoints return 403 Forbidden.
- /api/tasks/active/3, /api/tasks/history/3, /api/tasks/assigned/3, and /api/tasks/15/timeline return 200 OK with Employee B's confidential task data.

Security Impact:
Employees can surveil colleagues' real-time task activity, full historical timesheet logs, and timeline comments.

Root Cause:
TasksController.cs uses the guard:
if (_currentUser.EmployeeId != employeeId && !await _currentUser.HasPermissionAsync("Task.View")) return Forbid();
Since normal employees possess "Task.View", the second condition evaluates to false, bypassing the IDOR defense entirely. Additionally, line 168 maps any user with "Task.View" to role "Admin".

Recommended Fix:
Replace the check to ensure employees can only view their own tasks unless they possess a supervisory role or explicit administrative permission.
```

```text
================================================================================
SCENARIO 3: Employee ID Manipulation
================================================================================
Test: Manipulating employeeId via URL, Query, Body, Headers, and Claims
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: All state-changing endpoints (/api/attendance/login, /api/leaves/submit, etc.)
Attack Type: Parameter Manipulation / Identity Spoofing
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Intercept POST /api/leaves/submit and inject {"employeeId": 999}.
2. Intercept POST /api/attendance/login and send {"employeeId": 999} or X-Employee-Id: 999.

Expected Security Behavior:
Backend derives identity exclusively from the validated JWT token claims and rejects or ignores client-supplied employee IDs.

Actual Behavior:
The backend extracts identity via _currentUser.EmployeeId (reading ClaimTypes.NameIdentifier / employeeId claim). Injected body/header fields are completely ignored.

Security Impact:
None. Identity spoofing is completely prevented.

Root Cause:
Secure design implementation in CurrentUserService and service-layer entity mappings.

Recommended Fix:
No fix required. Maintain current pattern.
```

```text
================================================================================
SCENARIO 4: Role Manipulation
================================================================================
Test: Escalating role via request body parameter tampering (role, roleId, isAdmin)
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: /api/auth/change-password, /api/leaves/submit, /api/tasks/start
Attack Type: Privilege Escalation via Mass Assignment
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Intercept PUT/POST requests from an Employee account.
2. Inject JSON properties:
   {
     "role": "Admin",
     "roles": ["Admin", "Super Admin"],
     "isAdmin": true,
     "isSuperAdmin": true
   }

Expected Security Behavior:
Server rejects or ignores unauthorized role attributes.

Actual Behavior:
Controllers bind requests to strict DTO models that do not contain role modification properties. The JWT signing key prevents client-side claim forgery. Role modification endpoints (/api/roles, /api/users) return 403 Forbidden.

Security Impact:
None.

Root Cause:
Strong DTO encapsulation and HMAC-SHA256 token verification.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 5: Permission Manipulation
================================================================================
Test: Granting arbitrary permissions (permissionId, permissionIds, accessLevel) to self
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: /api/roles/{id}/permissions, /api/users/{id}
Attack Type: Unauthorized Permission Granting
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. As normal Employee, send PUT request:
   PUT /api/roles/2/permissions HTTP/1.1
   Authorization: Bearer <employee_jwt>
   Content-Type: application/json
   {"permissionIds": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}

Expected Security Behavior:
HTTP 403 Forbidden.

Actual Behavior:
HTTP 403 Forbidden (RolesController enforces [RequirePermission("Role.Assign")]).

Security Impact:
None.

Root Cause:
Role and Permission management endpoints are properly protected by permission-based authorization policies.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 6: Request Tampering (Ownership / Approval Fields)
================================================================================
Test: Injecting CreatedBy, ApprovedBy, Status="Approved", DepartmentId into creation requests
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: /api/leaves/submit, /api/permissions/submit, /api/tasks/start
Attack Type: Request Tampering / State Modification
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Submit a leave application with forged approval fields:
   POST /api/leaves/submit HTTP/1.1
   Authorization: Bearer <employee_jwt>
   Content-Type: application/json
   {
     "leaveTypeId": 1,
     "fromDate": "2026-09-01",
     "toDate": "2026-09-02",
     "status": "Approved",
     "approvedBy": 1,
     "approvedAt": "2026-08-26T00:00:00Z"
   }

Expected Security Behavior:
Server must create the record in 'Pending' status with ApprovedBy as null.

Actual Behavior:
LeaveService explicitly creates LeaveRequest entity with Status = RequestStatus.Pending and ApprovedBy = null, ignoring all injected approval fields.

Security Impact:
None.

Root Cause:
Explicit entity constructor mapping inside service layer.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 7: HTTP Method Abuse
================================================================================
Test: Changing legitimate GET requests to POST/PUT/PATCH/DELETE on employee/department/role endpoints
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: /api/employees/123, /api/departments/1, /api/roles/1
Attack Type: HTTP Method Manipulation
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Issue DELETE /api/employees/2
2. Issue DELETE /api/departments/1
3. Issue PUT /api/employees/2

Expected Security Behavior:
HTTP 403 Forbidden on all destructive/mutating methods.

Actual Behavior:
- DELETE /api/employees/{id} returns 403 (Requires Employee.Delete / Employee.Deactivate)
- DELETE /api/departments/{id} returns 403 (Requires Department.Manage)
- PUT /api/employees/{id} returns 403 (Requires Employee.Edit)

Security Impact:
None.

Root Cause:
Fine-grained authorization attributes on every action method.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 8: API Parameter Tampering
================================================================================
Test: Manipulating pagination, sorting, filters, departmentId, and employeeId in reporting APIs
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: /api/reports/daily-production, /api/tasks/team-tasks
Attack Type: Parameter Tampering / Scope Expansion
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. As Employee A, request daily production report with departmentId=1 or employeeId=999:
   GET /api/reports/daily-production?employeeId=999&departmentId=1 HTTP/1.1
   Authorization: Bearer <employee_jwt>
2. In /api/tasks/team-tasks, supply unauthorized employeeId filter.

Expected Security Behavior:
Unauthorized filters are ignored, overridden to the caller's ID, or return empty safe datasets.

Actual Behavior:
- ReportsController checks !hasReportView and forcibly sets employeeId = _currentUser.EmployeeId.
- TaskService verifies teamEmployeeIds.Contains(query.EmployeeId) and returns totalCount: 0 if an employee outside the team is requested.

Security Impact:
None.

Root Cause:
Server-side parameter sanitization and authorization clamping.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 9: SQL Injection (SQLi)
================================================================================
Test: Injecting SQL payloads into search, filter, date, and ID parameters across all accessible APIs
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: All endpoints
Attack Type: SQL Injection
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Send payloads to search fields: ' OR '1'='1, '; EXEC sp_msforeachtable 'DROP TABLE ?'--, ' UNION SELECT @@version--
   GET /api/employees?search=' OR '1'='1
   GET /api/tasks/team-tasks?search=' OR '1'='1
2. Send non-numeric characters to ID parameters: /api/attendance/1' OR '1'='1

Expected Security Behavior:
Safe query parameterization; ASP.NET Core model binder returns 400 Bad Request on malformed types.

Actual Behavior:
- All database interactions utilize EF Core LINQ with parameterized SQL Server expressions.
- EF.Functions.Like parameters are securely passed as query arguments.
- Malformed numeric IDs are rejected by ASP.NET model validation before hitting the database.

Security Impact:
None.

Root Cause:
Consistent use of EF Core ORM without dynamic string-concatenated SQL queries.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 10: Mass Assignment / Over-Posting
================================================================================
Test: Injecting unexpected properties (role, isSuperAdmin, departmentId, createdBy) into JSON payloads
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: /api/tasks/start, /api/leaves/submit, /api/support/start
Attack Type: Mass Assignment
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Send arbitrary undeclared properties in request payloads.

Expected Security Behavior:
Undeclared fields are discarded by serializer and ignored by business logic.

Actual Behavior:
System uses isolated DTO classes. Business services explicitly construct entity instances from individual validated DTO fields.

Security Impact:
None.

Root Cause:
Strong Separation of Concerns (DTO vs Domain Model).

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 11: Employee Self-Approval Abuse
================================================================================
Test: Attempting self-approval of submitted Leave, Permission, or Attendance deviation requests
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: /api/leaves/{id}/approve, /api/permissions/{id}/approve, /api/attendance/{id}/mark-permission
Attack Type: Business Logic / Approval Workflow Bypass
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Submit a leave request to obtain a leaveId (e.g. 45).
2. As the applicant, call the approval endpoint:
   POST /api/leaves/45/approve HTTP/1.1
   Authorization: Bearer <employee_jwt>
3. Call /api/permissions/12/approve and /api/attendance/10/mark-permission.

Expected Security Behavior:
HTTP 403 Forbidden.

Actual Behavior:
HTTP 403 Forbidden. The endpoints enforce [RequirePermission("Leave.Approve")], [RequirePermission("Permission.Approve")], and [RequirePermission("Attendance.Approve")].

Security Impact:
None.

Root Cause:
Strict policy evaluation on all approval endpoints.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 12: Status Manipulation
================================================================================
Test: Transitioning requests directly from Pending → Approved or Rejected → Approved
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: /api/leaves, /api/permissions, /api/tasks
Attack Type: State Machine Manipulation
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Attempt direct state modification via PUT/PATCH on leave or permission records.

Expected Security Behavior:
No arbitrary status updating endpoints exist; all transitions require dedicated authorized workflow endpoints.

Actual Behavior:
No generic status update endpoint exists. State transitions occur only within dedicated business methods guarded by RBAC permissions.

Security Impact:
None.

Root Cause:
Domain-driven state transition constraints.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 13: Duplicate / Replay Abuse
================================================================================
Test: Replaying attendance logins, break starts, and leave submissions
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: /api/attendance/login, /api/breaks/start, /api/leaves/submit
Attack Type: Request Replay / State Duplication
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Send identical POST /api/attendance/login requests concurrently or sequentially.
2. Send identical POST /api/breaks/start requests sequentially.

Expected Security Behavior:
System rejects redundant state creation or handles request idempotently.

Actual Behavior:
- AttendanceService.LoginAsync Layer 2 idempotency check detects active attendance for the workday and returns the existing record without duplicate creation.
- BreakService throws InvalidOperationException("You already have an active break session.").
- LeaveService detects overlapping date ranges and aborts transaction.

Security Impact:
None.

Root Cause:
Explicit domain state checks prior to entity insertion.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 14: Race Condition Abuse
================================================================================
Test: Concurrent execution of Attendance Login, Break Start, and Task Start requests
Status: PASS
Severity: LOW
Affected Endpoint: /api/attendance/login, /api/breaks/start, /api/tasks/start
Attack Type: Concurrency / Race Condition
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Send 5 concurrent POST requests to /api/attendance/login using the same JWT.
2. Send 5 concurrent POST requests to /api/tasks/start.

Expected Security Behavior:
Only one session / task runs; no corrupt states.

Actual Behavior:
Application-level guards and EF Core context tracking prevent inconsistent multi-active states. Auto-hold routines serialize running tasks cleanly.

Security Impact:
Negligible.

Root Cause:
Clean state machine transitions in TaskService and AttendanceService.

Recommended Fix:
Consider adding a database unique constraint on (EmployeeId, WorkDate, LogoutTime IS NULL) on AttendanceLogs for defense-in-depth against extreme high-volume concurrent bursts.
```

```text
================================================================================
SCENARIO 15: Authentication Abuse & Token Integrity
================================================================================
Test: Tampering with JWT claims (sub, employeeId, role), reusing expired tokens, and post-logout token replay
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: All authenticated endpoints
Attack Type: JWT Claim Tampering / Stale Session Replay
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Modify employeeId or sub inside JWT payload without valid signature.
2. Attempt to use an expired JWT token.
3. Replay token from a previous calendar workday.

Expected Security Behavior:
401 Unauthorized on invalid signature, expired lifetime, or invalidated workday session.

Actual Behavior:
- Modified claims fail ASP.NET Core JWT signature validation (401).
- SessionValidationMiddleware verifies sessionId and tokenJti against EmployeeSessions table in database. When a session expires or workday ends, requests return 401 Unauthorized.

Security Impact:
None.

Root Cause:
Strong cryptographic verification and real-time database session validation middleware.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 16: Cross-Site Scripting (XSS) / Malicious Input
================================================================================
Test: Injecting script tags into Task remarks, Leave reasons, and Permission explanations
Status: PASS
Severity: LOW
Affected Endpoint: /api/tasks/start, /api/leaves/submit, /api/permissions/submit
Attack Type: Stored Cross-Site Scripting (XSS)
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Submit leave reason containing: <script>alert(document.cookie)</script><img src=x onerror=alert(1)>
2. Observe API response and database storage.

Expected Security Behavior:
Payload is treated as plain text; frontend client escapes output rendering.

Actual Behavior:
The backend stores the text safely as NVARCHAR strings. React frontend automatically HTML-encodes string bindings in JSX elements, preventing browser script execution.

Security Impact:
Low.

Root Cause:
React JSX auto-escaping default behavior.

Recommended Fix:
Ensure frontend developers never utilize dangerouslySetInnerHTML on employee-controlled remark fields without DOMPurify sanitization.
```

```text
================================================================================
SCENARIO 17: File & Document Abuse
================================================================================
Test: Uploading malicious files, bypassing MIME types, path traversal, guessing file URLs
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: N/A (No employee file upload endpoint)
Attack Type: Unrestricted File Upload / Path Traversal
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Search for file upload endpoints.
2. Test report export endpoints (/api/reports/export-daily-production, /api/payroll/monthly-report/export).

Expected Security Behavior:
Employees cannot upload arbitrary files; report exports are restricted.

Actual Behavior:
No file upload controller exists in the application. Report exports require Report.Export / Payroll.Export permissions (which return 403 Forbidden to Employees). Excel generation writes dynamically to in-memory streams, making path traversal impossible.

Security Impact:
None.

Root Cause:
No file upload attack surface exposed.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 18: Sensitive Data Exposure (Master Lookups)
================================================================================
Test: Accessing confidential client list, contact numbers, emails, and product mappings
Status: FAIL
Severity: MEDIUM
Affected Endpoint: 
  - GET /api/clients
  - GET /api/products
  - GET /api/mappings
Attack Type: Excessive Data Exposure / Broken Object Level Authorization
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. As a normal Employee, issue a GET request to /api/clients:
   GET /api/clients HTTP/1.1
   Host: target-api
   Authorization: Bearer <employee_jwt_token>

Expected Security Behavior:
Employees should receive 403 Forbidden or receive only sanitized public client/product names needed for task pickers.

Actual Behavior:
Endpoint returns 200 OK with full commercial client directory including Client Company Name, Contact Person Name, Email Address, Phone Number, and Full Postal Address.

Security Impact:
Confidential corporate customer directories and commercial contact details are accessible to all internal staff, creating a data exfiltration and competitive intelligence risk.

Root Cause:
ClientsController.cs, ProductsController.cs, and ProductClientMappingsController.cs only have [Authorize] on GetAll() without requiring "MasterData.View".

Recommended Fix:
1. Add [RequirePermission("MasterData.View")] to GetAll() on ClientsController, or
2. Provide a lightweight sanitized endpoint (e.g. GET /api/clients/lookup) that exposes only { Id, CompanyName } for task dropdowns, hiding private phone numbers and emails.
```

```text
================================================================================
SCENARIO 19: Frontend Security Bypass
================================================================================
Test: Modifying localStorage, React component state, unhiding admin buttons in DOM, calling raw API endpoints
Status: PASS
Severity: INFORMATIONAL
Affected Endpoint: All Backend API Controllers
Attack Type: Client-Side Security Control Bypass
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. In browser Developer Tools, set localStorage.setItem('role', 'Admin').
2. Manually trigger administrative API routes directly using fetch()/curl.

Expected Security Behavior:
Frontend state manipulation has no effect on server-side authorization enforcement.

Actual Behavior:
Every administrative backend endpoint validates the server-signed JWT claims and database permissions independently of frontend client state.

Security Impact:
None.

Root Cause:
Robust server-side authorization enforcement architecture.

Recommended Fix:
No fix required.
```

```text
================================================================================
SCENARIO 20: Application-Breaking Scenarios (Task Allocation Hierarchy Bypass)
================================================================================
Test: Normal employee assigning tasks to peers, managers, and executives
Status: FAIL
Severity: HIGH
Affected Endpoint: POST /api/tasks/assign
Attack Type: Business Logic Failure / Unauthorized Entity Assignment
Attacker Privilege: Normal Employee

Steps to Reproduce:
1. Identify employee ID of a manager or colleague (e.g. Employee ID: 1 - Admin or ID: 5 - Senior Dev).
2. As a normal Employee, send task assignment request:
   POST /api/tasks/assign HTTP/1.1
   Host: target-api
   Authorization: Bearer <employee_jwt>
   Content-Type: application/json
   {
     "employeeId": 1,
     "moduleName": "Compromised Module",
     "description": "Unauthorized task injected by employee",
     "customProductName": "Audit Test",
     "customClientName": "Internal",
     "priority": 3,
     "plannedStart": "2026-08-27T09:00:00Z",
     "dueDate": "2026-08-27T18:00:00Z"
   }

Expected Security Behavior:
HTTP 403 Forbidden or 400 Bad Request ("You are not authorized to assign tasks to this employee").

Actual Behavior:
HTTP 200 OK. The task is created under the target employee's active workload, an audit event is registered, and an official company email notification is dispatched to the target employee.

Security Impact:
Any employee can disrupt peer workflows, clutter task registers, inject fake tasks into managers' timelines, and abuse the automated email notification engine for spam or social engineering.

Root Cause:
In TaskService.cs (lines 216-222), the check currentUserRole != "Admin" only verifies targetEmployee.Id == currentUserId, but completely omits checking whether targetEmployee.ReportingPersonId == currentUserId.

Recommended Fix:
In TaskService.AssignTaskAsync, enforce strict reporting line verification:
if (currentUserRole != "Admin")
{
    if (targetEmployee.ReportingPersonId != currentUserId)
    {
        throw new UnauthorizedAccessException("You are only authorized to assign tasks to employees reporting directly to you.");
    }
}
```

---

## 3. Top Critical & High Risks Summary

| Rank | Vulnerability | Severity | Impact Summary | Affected Component |
| :---: | :--- | :---: | :--- | :--- |
| **#1** | **Full Task Engine Surveillance via Over-Privileged `Task.View`** | **HIGH** | Default employees can view all company tasks, project modules, timeline history, and active coworker tasks across all departments. | `DataSeeder.cs`, `TasksController.cs` |
| **#2** | **Unauthorized Company-Wide Task Assignment** | **HIGH** | Any employee can assign tasks to any other employee or manager in the company, dispatching official email alerts. | `TaskService.cs` (`AssignTaskAsync`) |
| **#3** | **Commercial Client Master Data Exposure** | **MEDIUM** | Standard employees can dump all corporate client records, direct emails, phone numbers, and addresses without authorization. | `ClientsController.cs` |

---

## 4. Recommended Fixes & Backend Code Remediation

### 1. Fix Task Engine Permissions & IDOR Guards

#### A. In `DataSeeder.cs`
Remove `"Task.View"` from the default `Employee` role map:
```diff
         ["Employee"] = new[]
         {
-            "Leave.Create", "Task.View", "AttendanceCalendar.View"
+            "Leave.Create", "AttendanceCalendar.View"
         },
```

#### B. In `TasksController.cs`
Ensure `GetAdminTasks` requires administrative rights, and IDOR checks explicitly check `Task.ViewAll` or management hierarchy rather than a broad employee permission:
```csharp
    [HttpGet("admin-all")]
    [RequirePermission("Task.Create", "Task.Assign", "Task.Delete")] // Restricted to Task Admins / Admins
    public async Task<IActionResult> GetAdminTasks(...)
```

```csharp
    [HttpGet("active/{employeeId}")]
    public async Task<IActionResult> GetActive(int employeeId)
    {
        if (_currentUser.EmployeeId != employeeId && !await _currentUser.HasPermissionAsync("Task.Assign") && !_currentUser.IsAdmin)
        {
            return Forbid();
        }
        var result = await _service.GetActiveTaskAsync(employeeId);
        return Ok(ApiResponse<ActiveTaskDto?>.SuccessResponse(result));
    }
```

---

### 2. Fix Task Assignment Hierarchy Validation

In `TaskService.cs` (`AssignTaskAsync`):
```diff
         // Permission Rule #3 & #10:
         // Admin: Can assign tasks to any employee.
         // Reporting Person: Can assign tasks ONLY to employees reporting directly to them.
         if (currentUserRole != "Admin")
         {
             if (targetEmployee.Id == currentUserId)
             {
                 throw new UnauthorizedAccessException("You cannot assign a team task to yourself. Please use the self-task section.");
             }
+
+            if (targetEmployee.ReportingPersonId != currentUserId)
+            {
+                throw new UnauthorizedAccessException("You are only authorized to assign tasks to employees reporting directly to you.");
+            }
         }
```

---

### 3. Restrict Commercial Client Master Data

In `ClientsController.cs`:
```diff
     [HttpGet]
+    [RequirePermission("MasterData.View", "MasterData.Manage")]
     public async Task<IActionResult> GetAll()
     {
         var result = await _service.GetAllAsync();
         return Ok(ApiResponse<List<ClientDto>>.SuccessResponse(result));
     }
```
*Note: If employees need a client dropdown for task creation, provide a lightweight sanitized endpoint `GET /api/clients/lookup` that returns only `{ Id, CompanyName }`.*

---

## 5. Security Conclusion

> **Question:** *"Can a normal Employee break or bypass any security boundary of the RIMS application?"*

### **Answer: YES.**

#### Summary of How:
1. **Surveillance & BOLA in Task Operations**: Because `"Task.View"` is assigned to the `Employee` role by default in the data seeder, an employee can directly call `GET /api/tasks/admin-all` as well as query any coworker's active task, history, and timeline via `GET /api/tasks/active/{id}`, `GET /api/tasks/history/{id}`, and `GET /api/tasks/{id}/timeline`.
2. **Task Assignment Hierarchy Bypass**: An employee can invoke `POST /api/tasks/assign` with any target employee's ID because the service layer fails to verify that the target reports to the authenticated user, allowing arbitrary task assignment across departments.
3. **Master Data Leakage**: An employee can call `GET /api/clients` and download all company client contact details and phone numbers due to a missing permission attribute.

#### Areas Where Security Successfully Held:
- **Admin Control Plane**: Core administrative engines (Users, Roles, Permissions, Global Settings, Departments, Designations, System Celebrations) completely block standard employees with **`403 Forbidden`**.
- **Financial & Identity Privacy**: All Payroll (payslips), Salary Structures, Attendance logs, and Leave master records strictly enforce token identity (`_currentUser.EmployeeId`) and could not be accessed or tampered with.
- **Data Integrity**: Parameter tampering, Mass assignment, SQL Injection, JWT tampering, and self-approval bypasses were completely thwarted by server-side domain models and parameterized queries.
