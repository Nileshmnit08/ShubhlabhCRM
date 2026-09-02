# Raw Material Prices Architecture Audit

## 1. Executive Summary
This document provides an architectural audit of the Raw Material Prices module in ShubhLabhCRM. The audit covers the database schema, UI components, routing, and shared business logic. No code changes were made during this sprint.

## 2. Scope of Audit
- **Routes & Pages:** `Dashboard.jsx`, `DailyPriceEntry.jsx`, `PriceHistory.jsx`, `PriceAnalysis.jsx`, `WhatsAppUpdate.jsx`, `Configuration.jsx` (and its tabs).
- **Database Schema:** Tables defined in migrations `107_raw_material_prices_schema.sql` and `108_master_data_architecture.sql`.
- **Shared Components:** `RawMaterialPriceHeader.jsx`, `TodaysMarketPricesTable.jsx`, `PriceTrendChart.jsx`, etc.

## 3. Database Architecture & Schema
- **Core Entities:**
  - `raw_materials`: Main master table for materials.
  - `material_quality_grades`: Quality variants per material.
  - `brokers` & `broker_materials`: Broker definitions and mapping to materials.
  - `raw_material_price_entries`: Transactional daily pricing records.
  - `whatsapp_price_reports` & `whatsapp_price_report_recipients`: WhatsApp tracking.
  - `raw_material_price_settings`: Module-level configurations.
  - `rm_units` & `rm_price_types`: Master tables for units and price types (introduced in migration 108).
- **RLS/Security:** 
  - Row Level Security (RLS) is enabled on all tables, but current policies use `Allow all` (`USING (true) WITH CHECK (true)`). While suitable for open development, this is a severe security risk for production deployment.
- **Data Model Risks:** 
  - The fallback strings `unit` and `price_type` in `raw_material_price_entries` were kept nullable in migration 108. UI dependencies need to properly transition to `unit_id` and `price_type_id`.
  - The WhatsApp reporting tables store reports, but the actual message generation is done client-side.

## 4. UI Architecture & Route Inspection
- **Routing:** Handled cleanly in `app/src/pages/RawMaterialPrices/index.jsx` using `react-router-dom` with an index route for the Dashboard and distinct paths for each sub-module.
- **Component Analysis:**
  - `Configuration.jsx`: Acts as a container for multiple master-data tabs.
  - `RawMaterialsTab.jsx`: **High Risk.** A monolithic component (>700 lines) that manages complex state, API calls, pagination, and form modals. Needs refactoring into smaller sub-components.
  - `DailyPriceEntry.jsx`: Manages a large dynamic array of entries with complex interdependent auto-fills (e.g., auto-filling location based on broker). 
  - `PriceHistory.jsx`: Implements a mix of server-side pagination and client-side search. The client-side search only operates on the currently fetched page data, leading to inconsistent search results across the entire dataset.
  - `WhatsAppUpdate.jsx`: Contains heavy business logic for aggregating and determining price trends (increases/decreases/stable) client-side before formatting the WhatsApp string.

## 5. Identified Duplications & Inconsistencies
- **Duplicated Business Logic:**
  - Aggregation logic (calculating average prices, finding lowest/latest prices, computing price differences from previous days) is duplicated across `Dashboard.jsx`, `PriceAnalysis.jsx`, and `WhatsAppUpdate.jsx`. A centralized database function (RPC) or shared utility class would heavily reduce this duplication.
- **Component Duplication:**
  - Standard table structures, pagination layouts, and empty states are manually implemented in multiple places. Standardized UI components (like `MasterDataTable` or a generic DataGrid) are only partially utilized.

## 6. Recommendations & Deferred Items
1. **Refactor WhatsApp Logic:** Move the complex WhatsApp data aggregation to a PostgreSQL function (RPC) to reduce client-side payload and ensure consistency.
2. **Refactor Monolithic Components:** Split `RawMaterialsTab.jsx` into separate files for the Form Modal, the Table view, and the Toolbar/Filters.
3. **Fix Pagination/Search in History:** Move full-text search to the backend (e.g., using `ilike` filters in Supabase RPCs) so it scales with paginated data.
4. **Secure RLS Policies:** Restrict the `Allow all` policies to authenticated users and scoped roles before production.
5. **Normalize Price Types & Units:** Complete the transition from raw strings to relation IDs (`unit_id`, `price_type_id`) across all components and drop the string columns if no longer needed.
