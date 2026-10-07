| # | Feature | Entry Point | Action | Expected | Actual | Status | Fix |
|---|---------|-------------|--------|----------|--------|--------|-----|
| 1 | App Boot | OS | Launch App | Clean boot, no React errors | Booted cleanly | PASS | N/A |
| 2 | Home Actions | Home | Tap "New Order" | Open New Order screen | Opened New Order | PASS | N/A |
| 3 | Home Actions | Home | Tap "Browse Products" | Open Product Catalogue | Opened Catalogue | PASS | N/A |
| 4 | Bottom Nav | Home | Tap Tabs | Switch seamlessly | Switches properly | PASS | N/A |
| 5 | Profile Menu | Profile | Tap "Business Updates" | Open Updates List | Rendered list | PASS | N/A |
| 6 | Profile Menu | Profile | Tap "My Orders" | Open Orders | Opened Orders | PASS | N/A |
| 7 | Profile Menu | Profile | Tap "Support" | Open Support Form | Opened ComplaintCenter | PASS | N/A |
| 8 | Back Navigation | Product Cat | OS Back | Return Home | Returns Home | PASS | N/A |
| 9 | New Order | New Order | View Categories | Display 7 categories | Blank | BLOCKED | DB Access Blocked |
| 10 | New Order | New Order | View Products | Display products | Blank | BLOCKED | DB Access Blocked |
| 11 | Add to Cart | New Order | Tap Add | Add product to draft | Fails (No products) | BLOCKED | DB Access Blocked |
| 12 | Cart Nav | Product Cat | Tap Cart Icon | Go to Orders | Unhandled Action Error | PASS (Fixed)| Updated Route |
| 13 | Repeat Order | Home | Tap "Repeat Order" | Prefill New Order | Empty list (No orders)| PASS | N/A |
| 14 | Auth Bypass | App Boot | Check logs | Ensure no auth bypass | Verified auth token | PASS | N/A |
| 15 | Header Back | My Orders | Tap Back | Go back to Parent | Returned to Parent | PASS | N/A |
| 16 | Edit Order | Orders | Tap Edit Order | Open editor | Fails (No orders) | BLOCKED | DB Access Blocked |
