# QA Test Scenarios — Issue #163: Admin shares management view

## Scenarios

### S1: Shares page renders with correct structure
- **Type:** happy-path
- **Preconditions:** User is unauthenticated (no admin login)
- **Steps:**
  1. Navigate to `/admin/shares`
  2. Observe redirect behavior
- **Expected:** Unauthenticated user is redirected to `/login` (auth guard works)
- **Method:** playwright-cli

### S2: Auth guard protects shares route
- **Type:** error-state
- **Preconditions:** No authentication
- **Steps:**
  1. Navigate to `/admin/shares` directly
- **Expected:** Returns redirect to login or 401/403 — never 500
- **Method:** playwright-cli

### S3: Sidebar contains Shares nav item
- **Type:** happy-path
- **Preconditions:** Login page accessible
- **Steps:**
  1. Navigate to `/login`
  2. Check sidebar structure (if visible) or verify Shares link exists in admin layout
- **Expected:** "Shares" nav link pointing to `/admin/shares` exists in the sidebar
- **Method:** playwright-cli (source code verification)

### S4: Summary cards render (server component)
- **Type:** happy-path
- **Preconditions:** Authenticated admin user with shares data
- **Steps:**
  1. Navigate to `/admin/shares` as admin
  2. Check for 4 summary cards
- **Expected:** Cards for Total Shares, Total Revenue, Paid, Unpaid are present
- **Method:** agent-browser

### S5: Year filter dropdown renders and changes data
- **Type:** happy-path
- **Preconditions:** Authenticated admin
- **Steps:**
  1. Navigate to shares page
  2. Check year selector exists
  3. Change year
- **Expected:** Table data updates to show only shares for selected year
- **Method:** agent-browser

### S6: Status filter pills work (All, Paid, Unpaid)
- **Type:** happy-path
- **Preconditions:** Authenticated admin with mixed paid/unpaid shares
- **Steps:**
  1. Click "Paid" pill
  2. Verify only paid shares shown
  3. Click "Unpaid" pill
  4. Verify only unpaid shares shown
  5. Click "All" pill
  6. Verify all shares shown
- **Expected:** Filter pills correctly filter the table
- **Method:** agent-browser

### S7: Search filters by person name and family name
- **Type:** happy-path
- **Preconditions:** Authenticated admin with shares data
- **Steps:**
  1. Type a person name in search
  2. Verify results narrow
  3. Clear and type a family name
  4. Verify results narrow
- **Expected:** Search filters table correctly
- **Method:** agent-browser

### S8: Table columns are sortable
- **Type:** happy-path
- **Preconditions:** Authenticated admin with shares data
- **Steps:**
  1. Click "Person Name" header
  2. Verify sort ascending
  3. Click again for descending
  4. Repeat for other sortable columns
- **Expected:** Each column sorts correctly
- **Method:** agent-browser

### S9: Checkbox selection works (individual + select-all)
- **Type:** happy-path
- **Preconditions:** Authenticated admin with shares data
- **Steps:**
  1. Check individual row checkbox
  2. Check select-all checkbox
  3. Uncheck select-all
- **Expected:** Selection state tracks correctly
- **Method:** agent-browser

### S10: Mark as Paid modal opens with correct count
- **Type:** happy-path
- **Preconditions:** Authenticated admin, unpaid shares selected
- **Steps:**
  1. Select unpaid shares
  2. Click "Mark as Paid" button
  3. Modal opens
- **Expected:** Modal shows correct count, has payment method dropdown and note field
- **Method:** agent-browser

### S11: CSV export downloads file
- **Type:** happy-path
- **Preconditions:** Authenticated admin with shares data
- **Steps:**
  1. Click "Export CSV" button
- **Expected:** CSV file downloads with correct columns (Person Name, Bought By, Amount, Paid, Date)
- **Method:** agent-browser

### S12: Empty state shows when no shares match filters
- **Type:** edge-case
- **Preconditions:** Authenticated admin
- **Steps:**
  1. Search for non-existent name
- **Expected:** "No shares match your filters." message shown
- **Method:** agent-browser

### S13: Mark as Paid button only shows on unpaid rows
- **Type:** edge-case
- **Preconditions:** Authenticated admin with paid and unpaid shares
- **Steps:**
  1. View table with both paid and unpaid shares
- **Expected:** Check icon button only appears on unpaid rows
- **Method:** agent-browser

### S14: Bulk mark-paid only counts unpaid selections
- **Type:** edge-case
- **Preconditions:** Mix of paid and unpaid shares selected
- **Steps:**
  1. Select both paid and unpaid shares
  2. Check "Mark as Paid" button count
- **Expected:** Button count only reflects unpaid shares in the selection
- **Method:** agent-browser

### S15: Pagination works correctly
- **Type:** happy-path
- **Preconditions:** More than 20 shares in a year
- **Steps:**
  1. Verify pagination controls appear
  2. Click Next
  3. Click Previous
- **Expected:** Pagination navigates correctly, shows correct page counts
- **Method:** agent-browser

### S16: Regression — existing admin pages still load
- **Type:** regression
- **Preconditions:** None (unauthenticated)
- **Steps:**
  1. Navigate to `/admin/dashboard`
  2. Navigate to `/admin/events`
  3. Navigate to `/admin/announcements`
- **Expected:** All redirect to login properly (no 500 errors)
- **Method:** playwright-cli

### S17: Regression — existing public pages still load
- **Type:** regression
- **Preconditions:** None
- **Steps:**
  1. Navigate to `/`, `/about`, `/giving`, `/contact`, `/events`
- **Expected:** All return 200 with nav and footer visible
- **Method:** playwright-cli

### S18: Shares page on mobile viewport
- **Type:** responsive
- **Preconditions:** Mobile viewport (Pixel 5)
- **Steps:**
  1. Navigate to `/admin/shares` (will redirect to login)
  2. Verify page doesn't error
- **Expected:** No 500 errors, responsive layout works
- **Method:** playwright-cli

### S19: No console errors on shares route
- **Type:** error-state
- **Preconditions:** None
- **Steps:**
  1. Navigate to `/admin/shares`
  2. Monitor console for errors
- **Expected:** No unexpected JS console errors
- **Method:** playwright-cli
