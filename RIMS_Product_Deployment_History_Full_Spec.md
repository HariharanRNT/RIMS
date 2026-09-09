# RIMS — Product Deployment History Module

## Objective

Implement a new **Product Deployment History** module in the existing RIMS application.

The module must allow authorized employees to track product-related issues through the complete development and deployment lifecycle:

**Issue → Development → Testing → Testing Completed → Delivery**

The module must provide strict employee-level access control based on:

1. Module access permission
2. Product assignment
3. Product-to-client mapping

Admins must have complete visibility and reporting access.

The implementation must integrate with the existing RIMS authentication, authorization, employee, product, client, database, UI, and Excel export architecture without breaking existing functionality.

---

# 1. User Roles

## Admin

Admin can:

* Enable/disable Product Deployment History access for employees.
* Assign one or more products to an employee.
* Map clients to products.
* View all products.
* View all clients.
* View all employees.
* View all deployment records.
* View complete deployment activity history.
* Filter deployment records.
* Export deployment data to Excel.
* Export filtered or complete reports.
* View which employee created or modified each record.
* View the complete status-change audit history.

## Employee

Employee can access Product Deployment History only when Admin has explicitly enabled the permission.

Employee can:

* View only assigned products.
* View only clients mapped to those assigned products.
* Create deployment records only for authorized products.
* Update deployment records for products they are authorized to access.
* Move deployment records through allowed lifecycle statuses.
* View deployment activity history for records they are authorized to access.
* Export only the records they are authorized to view.

Employees must never be able to bypass these restrictions through URL manipulation, API requests, query parameters, or frontend modifications.

Authorization must be enforced on the backend/API level, not only in the frontend.

---

# 2. Admin Permission Configuration

Add a new permission: **Product Deployment History**

Admin should be able to enable or disable this permission for each employee.

Example:

| Employee | Permission | Products |
|---|---|---|
| Employee A | Enabled | OLMS, ABC |
| Employee B | Enabled | OLMS |
| Employee C | Enabled | XYZ |
| Employee D | Disabled | — |

### Expected visibility

- Employee A: OLMS, ABC
- Employee B: OLMS only
- Employee C: XYZ only
- Employee D: Module not visible or accessible

---

# 3. Product Master

Use the existing Product Master if one already exists in RIMS. If no suitable Product Master exists, create one.

Product fields (minimum): Product ID, Product Name, Product Code, Description, Active/Inactive, Created By, Created Date, Modified By, Modified Date.

Do not create duplicate product records if RIMS already contains an appropriate product master.

---

# 4. Product–Client Mapping

Admin must be able to map multiple clients to a product.

Example: OLMS → Client A, Client B, Client C · ABC → Client D, Client E · XYZ → Client F

When an employee selects a product while creating a deployment record, the **Client dropdown must automatically display only clients mapped to that product**. The backend must also validate the Product–Client relationship before saving the record — do not rely only on frontend filtering.

---

# 5. Employee–Product Mapping

Admin must be able to assign multiple products to an employee. Recommended structure: `Employee → Product Deployment History Permission → Assigned Products`.

The employee must only see deployment records belonging to their authorized products.

---

# 6. Product Deployment History — Screens

New module/menu: **Product Deployment History**

**Employee:** Deployment History · Add Deployment · View/Edit Deployment · Deployment Activity History · Export Excel

**Admin:** Deployment History · Product Management · Product–Client Mapping · Employee Product Access · Deployment Reports · Deployment Activity History · Export Excel

---

# 7. Deployment Record Fields

| Field | Type | Required |
|---|---|---|
| Product | Dropdown | Yes |
| Client | Dropdown | Yes |
| Issue | Text | Yes |
| Issue Date | Date | Yes |
| Description | Multiline Text | Yes |
| Development Process | Text/Multiline | Yes |
| Current Status | Status Dropdown | Yes |
| Moved to Testing | Boolean/Status | No |
| Testing Completed | Boolean/Status | No |
| Delivery Date | Date | No |
| Version | Text | No |

Recommended status values: New · Development In Progress · Development Completed · Moved to Testing · Testing In Progress · Testing Completed · Ready for Delivery · Delivered · Rejected · On Hold

The exact status list should be configurable if the existing RIMS architecture supports configurable statuses.

---

# 8. Status Transition Rules

**Forward lifecycle:** New → Development In Progress → Development Completed → Moved to Testing → Testing In Progress → Testing Completed → Ready for Delivery → Delivered

**Reopen (backward) transitions are also valid** — testing frequently sends work back to development, and this must be an explicit, supported path rather than a workaround:

| From | To | Typical reason |
|---|---|---|
| Testing In Progress | Development In Progress | Bug found during testing |
| Testing Completed | Development In Progress | Issue discovered after testing sign-off |
| Ready for Delivery | Development In Progress | Client rejected, or issue found before delivery |

This uses the existing **"Reopened"** action already listed in Section 10.

Do not allow invalid status transitions (e.g., New jumping straight to Delivered) unless Admin configuration explicitly permits them. The transition matrix (which statuses can move to which) should be enforced server-side, not just suggested in the UI.

**Behavior on reopen:**
- `CurrentStatus` updates to `Development In Progress` (or the applicable status).
- `MovedToTesting` and `TestingCompleted` flags reset to `No`/false, since the record is no longer in a currently-tested state.
- The **existing** `MovedToTestingBy/At` and `TestingCompletedBy/At` values on the main record are **not deleted** — they simply stop representing "current" state; the full history remains in the Activity table.
- **Remarks becomes required** when the action is "Reopened," so there's always a stated reason (e.g., "Bug in status sync found during QA").
- When the record is fixed and re-enters testing, it receives **new** Moved to Testing / Testing Completed timestamps, so a record can show two (or more) full test cycles across its Activity History — this is expected and desired, not a data error.

When a user changes the status, automatically record: Previous Status, New Status, Changed By, Changed Date & Time, Remarks (required for Reopened, optional otherwise). The status timestamp must be generated by the backend/server. Users must not manually enter or modify audit timestamps.

---

# 9. Shared-Record Requirement

Multiple employees may be assigned to the same product (e.g., OLMS → Employee A and Employee B). Both can access OLMS deployment records. Employee A creates a record; Employee B later updates it. The system must NOT overwrite the previous employee's activity — every important change must be recorded in a separate audit/activity history.

---

# 10. Deployment Activity History

Create a separate deployment activity/audit table.

Fields: Activity ID, Deployment ID, Action Type, Previous Status, New Status, Remarks, Changed By Employee ID, Changed By Employee Name, Changed Date & Time.

Possible actions: Created · Updated · Status Changed · Moved to Testing · Testing Started · Testing Completed · Delivery Date Updated · Version Updated · Reopened · Put On Hold

Example:

| Action | Previous | New | Employee | Date & Time |
|---|---|---|---|---|
| Created | - | New | Employee A | 07-Sep-2026 10:00 |
| Status Changed | New | Development | Employee A | 07-Sep-2026 11:15 |
| Status Changed | Development | Testing | Employee B | 08-Sep-2026 14:20 |
| Status Changed | Testing | Testing Completed | Employee C | 09-Sep-2026 16:40 |
| Status Changed | Testing Completed | Delivered | Employee B | 10-Sep-2026 12:30 |

This history must never be deleted or overwritten during normal record editing.

---

# 11. Audit Fields on Main Deployment Record

Created By/Date & Time · Last Modified By/Date & Time · Moved to Testing By/Date & Time · Testing Completed By/Date & Time · Delivered By/Date & Time

Automatically populated by the backend; read-only in the UI. The activity history remains the source of truth for the complete audit trail.

---

# 12. Employee Visibility Rules

Enforced at the API/database query level, for every deployment-history API request:

1. Authenticate the employee.
2. Verify Product Deployment History permission.
3. Retrieve employee's assigned products.
4. Restrict deployment records to those products.
5. Validate product-client mapping.
6. Return only authorized records.

Example: Employee B (Enabled, assigned OLMS) must receive OLMS records only — never ABC, XYZ, or unassigned products, even via manipulated deployment ID, product ID, URL parameter, request body, or API query parameter.

---

# 13. Create/Edit Authorization

**Create:** Product must belong to employee's assigned products · Client must belong to the selected product · Employee must have permission.

**Edit:** Verify employee still has access to the deployment's product · verify product authorization · reject unauthorized updates.

If Admin removes an employee's product access, the employee must immediately lose access to that product's deployment records. Existing historical audit records must not be deleted.

---

# 14. Admin Reporting

Filters: Product, Client, Employee, Current Status, Issue, Issue Date From/To, Delivery Date From/To, Version.

Admin can search, filter, sort, view details, view activity history, export Excel — across all products and employees.

---

# 15. Employee Reporting

Same report-style interface, auto-filtered to authorized products/clients/records. Employee cannot remove or bypass the authorization filter.

---

# 16. Excel Export

**Export Excel** available for both Admin and Employee.

- Admin: export all records or currently filtered records.
- Employee: export only records they're authorized to access — never export unauthorized records even if the frontend sends a manipulated filter.

---

# 17. Recommended Excel Format

File name: **OLMS_Product_Deployment_History.xlsx**

Sheet 1 — **Deployment History** columns:
1. Product · 2. Client · 3. Issue · 4. Issue Date · 5. Description · 6. Development Process · 7. Current Status · 8. Moved to Testing · 9. Moved to Testing By · 10. Moved to Testing Date & Time · 11. Testing Completed · 12. Testing Completed By · 13. Testing Completed Date & Time · 14. Delivery Date · 15. Delivered By · 16. Version · 17. Created By · 18. Created Date & Time · 19. Last Modified By · 20. Last Modified Date & Time

---

# 18. Excel Activity History Sheet

Sheet 2 — **Activity History** columns:
1. Deployment ID · 2. Product · 3. Client · 4. Issue · 5. Action · 6. Previous Status · 7. New Status · 8. Remarks · 9. Changed By · 10. Changed Date & Time

Ensures the complete history is preserved in Excel even when two or more employees work on the same product/deployment.

---

# 19. User-Friendly UI

Deployment list displays: Product, Client, Issue, Issue Date, Current Status, Version, Delivery Date, Last Updated By, Last Updated Date. Use status badges (New / Development / Testing / Testing Completed / Delivered).

Provide: Search · Filters · Sort · Pagination · Add New Deployment · Edit · View Details · View Activity History · Export Excel. Use confirmation dialogs for important status changes and clear validation/error messages.

---

# 20. Deployment Details Screen

**Basic Information:** Product, Client, Issue, Issue Date, Description, Version
**Development:** Development Process, Current Status
**Testing:** Moved to Testing (+ By/Date-Time), Testing Completed (+ By/Date-Time)
**Delivery:** Delivery Date, Delivered By
**Audit:** Created By/Date-Time, Last Modified By/Date-Time
**Activity Timeline:** all status changes, chronologically, with employee + date/time.

---

# 21. Database Design

**Product** — existing Product Master or new Product table.
**Client** — existing Client Master.

**ProductClientMapping**: ID, ProductID, ClientID, IsActive, CreatedBy, CreatedAt

**EmployeeProductAccess**: ID, EmployeeID, ProductID, IsActive, CreatedBy, CreatedAt

**ProductDeploymentHistory**: ID, ProductID, ClientID, Issue, IssueDate, Description, DevelopmentProcess, CurrentStatus, DeliveryDate, Version, CreatedBy, CreatedAt, ModifiedBy, ModifiedAt, MovedToTestingBy, MovedToTestingAt, TestingCompletedBy, TestingCompletedAt, DeliveredBy, DeliveredAt

**ProductDeploymentActivity**: ID, DeploymentID, ActionType, PreviousStatus, NewStatus, Remarks, ChangedBy, ChangedAt

Use foreign keys and indexes on: ProductID, ClientID, CurrentStatus, IssueDate, DeliveryDate, CreatedBy.

---

# 22. Backend Security Requirements

Do not rely on frontend restrictions. All APIs must validate: authentication, employee status, module permission, product authorization, product-client mapping, record ownership/access through product mapping.

Prevent: IDOR · unauthorized product access · unauthorized deployment access · unauthorized Excel export · manipulation of employee IDs · manipulation of product IDs · manipulation of audit fields.

Audit fields must be generated server-side. Never accept `CreatedBy`, `CreatedAt`, `ModifiedBy`, `ModifiedAt`, `MovedToTestingBy`, `MovedToTestingAt`, `TestingCompletedBy`, `TestingCompletedAt` as trusted client input.

---

# 23. API Requirements

Follow existing RIMS API naming/conventions. Suggested endpoints:

- `GET /api/product-deployment-history`
- `POST /api/product-deployment-history`
- `GET /api/product-deployment-history/{id}`
- `PUT /api/product-deployment-history/{id}`
- `GET /api/product-deployment-history/{id}/activity`
- `GET /api/product-deployment-history/export`
- Admin config APIs: GET/PUT employee permission, GET/PUT employee product assignments, GET/PUT product-client mappings

---

# 24. Validation

Required: Product, Client, Issue, Issue Date, Description, Development Process, Current Status.

Validate: Product/Client exist and are active · Client belongs to selected Product · Employee has access to selected Product · Issue Date is valid · Delivery Date is valid relative to lifecycle rules · Version format if a convention exists. Display clear validation messages.

---

# 25. Excel Import — Optional Future Enhancement

If needed later, a separate **Import Deployment Data** feature should: validate column names, Product, Client, Product–Client mapping, dates, status, version; detect duplicates; show validation errors before import; never let imported data overwrite system-generated audit timestamps without an explicit Admin-only migration process. Imported records should still create audit entries.

---

# 26. Important Business Rule

If two or more employees are assigned to the same product (e.g., OLMS → Employee A and Employee B), both can see and update OLMS deployment records. Every modification must identify exactly **who changed it + what changed + when it changed**. A simple "last modified" field is not sufficient on its own — the complete activity history must be retained.

---

# 27. Acceptance Criteria

**Access**
- [ ] Admin can enable/disable Product Deployment History per employee.
- [ ] Disabled employees cannot access the module or APIs.
- [ ] Admin can assign/remove multiple products per employee.

**Product/Client**
- [ ] Admin can map multiple clients to a product.
- [ ] Product selection filters the client dropdown.
- [ ] Backend validates Product–Client mapping.

**Employee**
- [ ] Employee sees only authorized products/clients.
- [ ] Employee can create/edit only authorized records.
- [ ] Employee cannot bypass access via API manipulation.

**Shared Product**
- [ ] Multiple employees can access and work on the same product's records.
- [ ] Every modification records employee + timestamp; prior activity is never overwritten.

**Status**
- [ ] Status changes are tracked; Moved to Testing, Testing Completed, and Delivery each record employee + timestamp; status history is retained.

**Admin**
- [ ] Admin sees all products, clients, employees, records; can filter, view activity history.

**Excel**
- [ ] Admin exports all/filtered records; Employee exports only authorized records.
- [ ] Excel contains deployment info, audit info, and activity history; unauthorized records never appear in employee exports.

**Existing RIMS**
- [ ] Existing functionality, auth, masters, UI/DB/API conventions preserved.
- [ ] Migration scripts created; unit/integration/API/UI tests added for the new module.

---

# Final Implementation Goal

Build the Product Deployment History module as a fully integrated RIMS feature, not an isolated page.

**Admin flow:** Enable Module Access → Assign Products → Map Clients to Products → Employees receive authorized access
**Employee flow:** Product Deployment History → Select Product → Select mapped Client → Enter Issue & Development Details → Move to Testing → Testing Completed → Delivery → Version

At every important stage, **Employee + Action + Date & Time** must be automatically recorded. All permissions must be enforced on the backend, ensuring employees can never access products, clients, deployment records, or Excel data outside their assigned scope.
