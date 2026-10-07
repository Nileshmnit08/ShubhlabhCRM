## ISSUE-001

Feature: Product Catalogue Navigation
Screen: Product Catalogue Screen (ProductCatalogueScreen.js)
Steps: Open Product Catalogue -> Tap Shopping Cart Icon
Expected: Navigates to My Orders screen
Actual: Throws navigation error due to "OrdersTab" not existing in the navigator.
Root Cause: In `MainTabNavigator.js`, there is no `OrdersTab`. The correct route for Orders is `OrdersStack` with screen `MyOrders`.
File: `src/features/products/ProductCatalogueScreen.js`
Fix: Replaced `navigation.navigate('OrdersTab')` with `navigation.navigate('OrdersStack', { screen: 'MyOrders' })`.
Regression Result: PASS

## ISSUE-002

Feature: Product Master / New Order Category List
Screen: New Order (NewOrderScreen.js) & Product Catalogue (ProductCatalogueScreen.js)
Steps: Open New Order
Expected: Display Categories (Pallet, Churi, Mix, Daliya, Feed, etc.) and Products.
Actual: The categories and products lists are completely blank.
Root Cause: The `public.products` database table contains exactly 0 rows. (Checked via script bypassing UI). 
File: N/A (Database level)
Fix: BLOCKED — PRODUCT MASTER DATABASE ACCESS. Cannot seed the approved products because the mobile app and current environment lack a service role key or admin access to bypass RLS and insert the products.
Regression Result: BLOCKED
