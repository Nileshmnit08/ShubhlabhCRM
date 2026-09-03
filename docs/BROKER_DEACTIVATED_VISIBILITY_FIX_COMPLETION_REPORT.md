# BROKER DEACTIVATED VISIBILITY FIX - COMPLETION REPORT

## 1. Context & Scope
The objective of this micro-sprint was to keep the Deactivated Brokers table hidden by default on the Brokers page, avoiding empty tables or blank space issues, while allowing users to reveal it via a simple toggle.

## 2. Implementation Details

- **File Modified**: `d:/ShubhLabhCRM/app/src/pages/RawMaterialPrices/components/BrokersTab.jsx`
- **State Added**: Added a `showDeactivated` boolean state, defaulting to `false`.
- **Logic Updates**: 
  - Updated the `filteredData` logic. If `!showDeactivated`, it proactively filters out all inactive brokers (`b.active === false`).
  - Because filtering happens early in the memoized `filteredData` chain, the pagination logic automatically stays perfectly in sync (no empty pages with hidden rows). 
  - The `statusSections` mapping gracefully ignores the Deactivated table when its data length is zero, eliminating any blank spaces.
  - Added a responsive "Show/Hide Deactivated" button into the main toolbar next to the "Clear" filters button.
  - Updating the toggle resets the page to `1` to avoid breaking pagination limits.
  - "Clear Filters" also reliably resets `showDeactivated` back to `false`.

## 3. Testing Verification
- **Default State**: Table only shows Active Brokers.
- **Click Behavior**: Clicking "Show Deactivated" successfully reveals the Deactivated Brokers table directly below the Active table.
- **Blank Space Prevention**: Pagination handles the exact count of visible rows, preventing any ghost records or empty space.
- **Responsive Layout**: The button conforms to the existing flex layout in the toolbar without breaking mobile or desktop sizing.
