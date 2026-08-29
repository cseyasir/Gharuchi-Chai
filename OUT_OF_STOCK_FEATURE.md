# Out of Stock Feature - Implementation Guide

## What Was Added

### 1. **Database Migration** ✅
File: `add_availability_to_menu.sql`

Adds a new column to the `menu` table:
```sql
ALTER TABLE menu
ADD COLUMN is_available BOOLEAN DEFAULT true;
```

- **Default:** `true` (all existing items remain available)
- **Purpose:** Track availability status without hiding items
- **Persistence:** Saved in Supabase, same for all users

### 2. **Admin Page Updates** ✅  
File: `src/Components/Admin.jsx`

**New Function:**
- `toggleItemAvailability(id, currentAvailability)` - Toggles item availability

**New UI:**
- **Availability Badge:** Shows "Available" (blue) or "Out of Stock" (red)
- **New Button:** 📦 (green) = Available / 🔒 (red) = Out of Stock
  - Click to toggle without hiding the item
  - Hover shows "Toggle Available/Out of Stock"

**Menu Item Controls:**
- ✏️ Edit (name, price, image)
- 🚫/✅ Toggle Active/Inactive (hide/show item)
- **NEW:** 📦/🔒 Toggle Available/Out of Stock
- 🗑️ Delete

### 3. **Booking Page Updates** ✅
File: `src/Components/Booking.jsx`

**Visual Changes:**
- **Out of Stock Label:** Red text below price when unavailable
- **Button State:** 
  - Available: `ADD` button enabled
  - Out of Stock: `OUT` button disabled with reduced opacity
  - User cannot click when disabled

**Logic:**
```javascript
const isOutOfStock = item.is_available === false;
// Shows label if out of stock
// Disables button if out of stock
```

## How to Use

### For Admins:

1. **Go to Admin Panel** → Menu Management tab
2. **Find any menu item**
3. **Click the availability button** (📦 or 🔒):
   - 📦 (green) = Item is available → Click to mark out of stock
   - 🔒 (red) = Item is out of stock → Click to mark available
4. **Changes take effect immediately** across all user sessions

### For Users (Customers):

1. **Browse the menu** (Booking page)
2. **Out of Stock items:**
   - Still visible in menu
   - Show "Out of Stock" label in red
   - Button says "OUT" and is disabled
   - Cannot be added to cart
3. **Available items:** Work normally

## Database Setup

### To Enable This Feature:

**Option 1: Supabase SQL Editor (Recommended)**
1. Go to your Supabase project: https://app.supabase.com
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of `add_availability_to_menu.sql`
5. Click **Run**

**Option 2: Raw SQL**
```sql
ALTER TABLE menu
ADD COLUMN is_available BOOLEAN DEFAULT true;

COMMENT ON COLUMN menu.is_available IS 'true = Available, false = Out of Stock. Item is still visible but Add button is disabled.';
```

**After Migration:**
- ✅ All existing items default to `is_available = true`
- ✅ New items created via admin form will default to `true`
- ✅ Admin can toggle availability for any item
- ✅ Users will see "Out of Stock" label when unavailable

## Implementation Details

### Minimum Changes Made:
✅ No redesign of existing UI  
✅ No hidden items (unlike `is_active`)  
✅ No new pages or components  
✅ Only added label + disabled button state  
✅ Single new database column  
✅ One new function in Admin.jsx  

### What Was NOT Changed:
- Item visibility filtering (still uses `is_active`)
- Cart logic (availability just disables add button)
- Order processing (no stock quantity tracking)
- Menu structure or styling
- Any other functionality

## Testing Checklist

- [ ] Database migration executed successfully
- [ ] Admin page loads without errors
- [ ] Can toggle availability for any item (📦/🔒 button)
- [ ] Availability badge updates instantly
- [ ] Booking page shows "Out of Stock" label
- [ ] Button changes to "OUT" and becomes disabled
- [ ] Disabled button cannot be clicked
- [ ] Toggling back to available removes label and enables button
- [ ] Refreshing page maintains status (persisted in DB)

## Future Enhancements (Optional)

If you want to add more stock features later:
1. Add `quantity_available` column (INTEGER)
2. Track quantity when orders are placed
3. Auto-mark as out of stock when quantity = 0
4. Show "Only 2 left!" when low stock
5. Batch availability updates via CSV upload

For now, the simple boolean flag is the cleanest implementation.
