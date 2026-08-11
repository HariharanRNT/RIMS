# RIIMS Project Blueprint — Analysis & Gap Report (Updated)

> [!NOTE]
> **All 7 critical gaps have been resolved.** This document now reflects the finalized requirements.

---

## Resolved Decisions

### ✅ 7.1 — Department & Designation → Admin CRUD Modules

**Decision:** Yes. Department and Designation are master modules managed by Admin with full CRUD APIs and UI screens.

**Impact on blueprint:**
- Add `Department` and `Designation` table definitions to Section 3.2:
  - `Id PK, Name nvarchar(100) UNIQUE NOT NULL, IsActive, CreatedAt, UpdatedAt, CreatedBy`
- Add API endpoints to Section 4:
  ```
  GET    /api/departments
  POST   /api/departments
  PUT    /api/departments/{id}
  DELETE /api/departments/{id}    (soft delete)

  GET    /api/designations
  POST   /api/designations
  PUT    /api/designations/{id}
  DELETE /api/designations/{id}   (soft delete)
  ```
- Add Admin UI screens (data table + modal form, similar to Product/Client master pattern)

---

### ✅ 7.5 — Password Management

**Decision:**
1. Admin creates the employee.
2. A **temporary password** is auto-generated and **emailed** to the employee.
3. On **first login**, the employee is **forced to change the password**.

**Impact on blueprint:**
- Add `MustChangePassword` (bit, default 1) to the ASP.NET Identity user or a linked field.
- Auth flow update: after JWT is issued, if `MustChangePassword == true`, frontend redirects to a "Change Password" screen before allowing access.
- Add API endpoints:
  ```
  POST /api/auth/change-password
  Request: { "currentPassword": "...", "newPassword": "..." }
  ```
- Employee registration service must: generate temp password, create Identity user, send email via SMTP.

---

### ✅ 7.4 — Logout Auto-Close Policy

**Decision:** On logout:
1. `AttendanceLog.LogoutTime` is set (attendance ends).
2. Any **running task** is automatically put **OnHold** (TaskTimeLog closed, Task.Status → OnHold).
3. Any **active break** is ended (BreakLog.EndTime set).
4. Any **active support activity** is ended (SupportActivityLog.EndTime set).
5. **ActivityTimeline** records are written for each auto-closed event.
6. On next login, the employee can **manually resume** held tasks.

**Impact on blueprint:**
- Add as **Business Rule #17** in Section 6.
- `POST /api/attendance/logout` service logic must cascade through active task/break/support.
- Auto-closed support activities: since all support activities require Remarks+Product+Client, auto-close on logout should use a system-generated remark (e.g., "Auto-closed on logout") with the original Product/Client if available, or null if not yet provided.

---

### ✅ 7.6 — Support Activities: All Require Remarks

**Decision:** **All** support activities (Support Call, Call, Meeting, Discussion, Demo) require **Product, Client, and Remarks** before they can be stopped/completed.

**Impact on blueprint:**
- Update Business Rule #6: ~~"Call, Discussion, and Meeting"~~ → **"All support activities (Support Call, Call, Meeting, Discussion, Demo)"**.
- UI Section 5.3 popup applies to **all** support activity stop actions, not just Call/Discussion/Meeting.
- `SupportActivityLog` constraint: Remarks/ProductId/ClientId NOT NULL — enforced for all types.

---

### ✅ 7.7 — Grace Time: Shift-Relative, Configurable

**Decision:** Grace time is **configurable per shift**, not hardcoded to 10:15. Each shift has an allowed grace period (default: 15 minutes), defined in **system settings**.

**Impact on blueprint:**
- Add a `SystemSettings` table or a `GraceMinutes` column to `EmployeeWorkDetail`:
  - **Option A — System-wide:** `SystemSettings` table with key-value pairs (e.g., `GraceMinutes = 15`).
  - **Option B — Per-employee shift:** Add `GraceMinutes int DEFAULT 15` to `EmployeeWorkDetail`.
  - **Recommended: Option A** (system-wide setting) since "configurable per shift" implies a global default, with Option B as a future enhancement if per-employee override is needed.
- Grace calculation: `ShiftStart + GraceMinutes` instead of hardcoded 10:15.
- Permission offset rule (#13): `ShiftStart + GraceMinutes + 2 minutes` instead of 10:17.
- Add API for system settings (Admin):
  ```
  GET /api/settings
  PUT /api/settings
  ```

> [!IMPORTANT]
> **Clarification needed:** Should `GraceMinutes` be a single system-wide setting, or per-employee (via `EmployeeWorkDetail`)? I've recommended system-wide. Please confirm.

---

### ✅ 7.9 — Lookup Tables: All Admin-Managed CRUD

**Decision:** BreakType, SupportActivityType, LeaveType, Department, and Designation are **all Admin-managed** master data with full CRUD APIs.

**Impact on blueprint:**
- Add API endpoints:
  ```
  GET/POST/PUT/DELETE  /api/break-types
  GET/POST/PUT/DELETE  /api/support-activity-types
  GET/POST/PUT/DELETE  /api/leave-types
  ```
- Add Admin UI screens for each (simple data table + modal form pattern).
- All deletes are soft deletes (IsActive = 0).

---

### ✅ 7.17 — Naming: `productId` Everywhere

**Decision:** Use **`productId`** throughout the application. Replace all occurrences of `projectId`.

**Impact on blueprint:**
- Section 4.6 Task start request body:
  ```diff
  - { "projectId": 1, "clientId": 2, "module": "Dashboard", "description": "Bug Fix" }
  + { "productId": 1, "clientId": 2, "module": "Dashboard", "description": "Bug Fix" }
  ```
- Section 5.2 Work Task Panel: "Project" label in the UI should display as **"Product"** (or keep "Project" as a UI label mapped to `productId` — needs decision).

---

## Remaining Minor Ambiguities (Proceeding with Defaults)

| # | Ambiguity | Default Decision |
|---|-----------|-----------------|
| 7.2 | Permission: no reject endpoint | **Add reject endpoint** (`PUT /api/permissions/{id}/reject`) for parity with Leave |
| 7.3 | Admin sidebar not specified | Derive from screens: Dashboard, Employees, Products, Clients, Mappings, Leave Approvals, Permission Approvals, Lookup Masters, Reports, Settings |
| 7.10 | Dashboard date range | Multi-day range supported, max `to` date = yesterday |
| 7.11 | Monthly report Excel structure | One sheet per data category (Attendance, Leave, Permission, Grace, Payroll) with employee rows |
| 7.12 | Hangfire dashboard | Expose at `/hangfire`, restricted to Admin role |
| 7.13 | Completed task transitions | One-way: Completed tasks cannot be resumed (start a new task instead) |
| 7.14 | Multi-day leave across months | LOP calculated per calendar month allocation |
| 7.15 | Concurrent sessions | Previous session auto-closed on new login |
| 7.16 | EmployeeWorkDetail cardinality | 1:1 in practice (latest record used); historical records retained |
| 7.18 | Notification system | Phase 1: polling-based; future: SignalR for real-time |

---

## Final Entity Count

With the resolved decisions, the project now includes:

| Category | Entities |
|----------|----------|
| Master Data | Department, Designation, Product, Client, ProductClientMapping, BreakType, SupportActivityType, LeaveType |
| Employee | Employee, EmployeeWorkDetail |
| Time Tracking | Task, TaskTimeLog, AttendanceLog, BreakLog, SupportActivityLog, ActivityTimeline |
| Leave/Permission | LeaveRequest, PermissionRequest |
| Payroll | GraceTimeViolation, LOPCalculation, PayslipDetail |
| System | MonthlyReportLog, SystemSettings (new), AspNetIdentity tables |

**Total: ~22 application tables + ASP.NET Identity tables**

---

## Readiness Assessment

> [!TIP]
> **The blueprint is now complete enough to begin Phase 1 development.** All critical decisions are resolved. The minor ambiguities above have sensible defaults that won't cause rework.

### Phase 1 Scope (Ready to Plan)
- Solution scaffolding (all 5 projects + frontend)
- ASP.NET Identity + JWT auth
- Employee CRUD (with temp password + email)
- Department & Designation CRUD
- Attendance login/logout (with auto-close policy)
- System Settings (grace time config)
- IIS deployment pipeline proof
