# Live Tracking Dashboard - Feature Summary

## What Has Been Implemented

### 1. Role-Based Access Control (RBAC)
- **Dashboard is hidden from Delivery Agents**: Only users with "Delivery Manager" or "System Manager" roles can see the Live Dashboard menu option.
- **Roles are fetched during login** from ERPNext's `Has Role` DocType and stored in `localStorage`.
- If a user doesn't have the required role, they won't see the "Live Dashboard" option in the menu.

### 2. Driver Name Display (Instead of Driver ID)
- The system now stores and displays the **driver's human-readable name** (e.g., "Ahmed Mohamed") instead of just the driver ID.
- When a driver starts a trip, the system fetches `driver_name` from the Delivery Trip and sends it to the tracking database.
- The dashboard map popup now shows the driver's name prominently.

### 3. Branch-Based Filtering (Multi-Branch Support)
- Each manager can only see drivers from **their own branch/company**.
- During login, the system fetches the user's `company` field from the Employee record in ERPNext.
- The dashboard API filters all tracking data by the logged-in manager's company.
- **Example**: If "Manager A" belongs to "Cairo Branch", they will only see drivers currently working on trips assigned to "Cairo Branch".

### 4. Desktop-Optimized Dashboard
- The dashboard uses **full screen width** (`max-w-7xl`) instead of mobile-constrained width.
- The map and KPI cards are designed for comfortable viewing on desktop/laptop screens.
- The mobile driver app remains mobile-optimized (`max-w-md`).

### 5. Database Schema Enhancements
The PostgreSQL `tracking_sessions` table now includes:
- `driver_name TEXT` – Human-readable driver name
- `company TEXT` – Branch/company for filtering

### 6. Updated API Endpoints
- `POST /tracking/session/start`: Now accepts `driverName` and `company` in the payload.
- `GET /tracking/dashboard/live?company=XYZ`: Filters active sessions by company.
- `GET /tracking/dashboard/kpis?company=XYZ`: Filters KPIs by company.

## How It Works (End-to-End Flow)

### For Delivery Managers:
1. **Login**: Manager logs in with their ERPNext credentials.
2. **Role Check**: System fetches roles from ERPNext and stores them in `localStorage`.
3. **Company Fetch**: System fetches manager's company (e.g., "Cairo Branch") from Employee record.
4. **Dashboard Access**: Manager sees "Live Dashboard" option in the menu (only if they have "Delivery Manager" role).
5. **View Filtered Data**: Dashboard shows only drivers from their branch, with driver names displayed clearly.

### For Delivery Agents (Drivers):
1. **Login**: Driver logs in with their ERPNext credentials.
2. **No Dashboard Access**: They don't see the "Live Dashboard" menu option (role-based hiding).
3. **Start Trip**: When they press "Start Stop", the app sends their name and branch to the tracking system.
4. **Location Tracking**: GPS pings are sent every ~15 seconds while the trip is active.
5. **Complete Trip**: When they complete the delivery in ERP, tracking stops automatically.

## Important Configuration Notes

### Required ERPNext Setup:
1. **Roles**: Create a "Delivery Manager" role in ERPNext and assign it to branch managers.
2. **Employee Records**: Ensure all drivers and managers have Employee records with:
   - `user_id` field set to their ERPNext User email
   - `company` field set to their branch (e.g., "Cairo Branch", "Alexandria Branch")
3. **Delivery Trip**: Must include `driver_name` and `company` fields (standard in ERPNext).

### Environment Variables:
- `TRACKING_DATABASE_URL`: PostgreSQL connection string (already configured).

### Security Considerations:
- Managers cannot bypass the company filter (it's enforced server-side).
- Drivers cannot access the dashboard (client + server-side protection).
- All tracking data is filtered by company at the database level.

## Testing Checklist

### As a Manager:
- [ ] Login with a manager account that has "Delivery Manager" role.
- [ ] Verify "Live Dashboard" appears in the menu.
- [ ] Open dashboard and verify you only see drivers from your branch.
- [ ] Verify driver names (not IDs) appear on the map.
- [ ] Verify KPI cards show correct counts filtered by your branch.

### As a Driver:
- [ ] Login with a driver account (no manager role).
- [ ] Verify "Live Dashboard" does NOT appear in the menu.
- [ ] Start a trip and verify tracking starts.
- [ ] Ask a manager to check if your name appears on their dashboard (not your employee ID).

## Known Limitations

1. **PostgreSQL Schema Migration**: If you have existing data, you need to add the new columns:
   ```sql
   ALTER TABLE tracking_sessions ADD COLUMN IF NOT EXISTS driver_name TEXT;
   ALTER TABLE tracking_sessions ADD COLUMN IF NOT EXISTS company TEXT;
   ```
   (Or drop and recreate the table; the app will auto-create it on next startup.)

2. **Company Field Dependency**: The filtering depends on ERPNext's `company` field being populated correctly in both Employee and Delivery Trip records.

3. **Role Naming**: The role must be exactly "Delivery Manager" or "System Manager" (case-sensitive) as defined in the code. You can add more roles by editing `Layout.tsx`.
