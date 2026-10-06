# SL-ORDER-04-AUDIT

## 1. Existing Product Data Source
- Backend table: `public.products`
- Existing Columns: `id`, `name`, `category`, `active`, `created_at`, `bag_conversion_factor`, `unit_of_measure`.
- **Note on Price & Images:** There are no explicit `price`, `image_url`, or `scheme_badge` columns available directly in the `products` table based on the database schema. The UI will gracefully omit pricing if unavailable, complying with the requirement not to hallucinate backend architectures or fake business limits. We will show `unit_of_measure` (e.g. Bags) as the pack size.

## 2. Existing Product API
- Supabase REST API via `supabase.from('products').select('*')`.
- RLS Policy: `Allow all on products` exists in `05_sprint_5_schema.sql` (`USING (true)`). This is safe for public product visibility, as catalogue items are globally readable.

## 3. Existing Product Screen
- `src/features/products/ProductCatalogueScreen.js` is a placeholder returning a centered text view.

## 4. Missing Functionality
- Full Product Catalogue UI (Search, Product Cards, Quantity Controls, Category tabs).
- FlatList rendering.
- Add to Order (Order Mein Jodein) state handler.
- Empty states and Error states.

## 5. Files to modify
- `src/features/products/ProductCatalogueScreen.js`

## 6. Files to leave untouched
- All other mobile applications (`mobile`, `mobileFieldStaff`).
- Database schemas (No SQL changes allowed).

## 7. Backend Dependencies
- Supabase JS client.

## 8. Security Risks & Blockers
- **Risk:** RLS on `products` is `USING (true)`, meaning all authenticated (and potentially anonymous) users can read it. This is standard for a catalogue. No buyer-specific pricing tables exist yet, so we won't expose unauthorized prices.
- **Blockers:** None. We will implement the Product Catalogue UI using the data that is available (Name, Category, Unit).
