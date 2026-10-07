| # | Entry Point | Action/Menu | Destination | Back Path | Tested | Result |
|---|-------------|-------------|-------------|-----------|--------|--------|
| 1 | Home | Add Order / New Order | NewOrderTab (NewOrderMain) | Home | Yes | PASS |
| 2 | Home | Repeat Last Order | NewOrderTab (NewOrderMain) | Home | Yes | PASS (With existing order param) |
| 3 | Home | Browse Products | ProductsTab (ProductCatalogue) | Home | Yes | PASS |
| 4 | Home | Current Order | OrdersStack (OrderDetail) | Home | Yes | PASS |
| 5 | Bottom Nav | Home | HomeTab | N/A | Yes | PASS |
| 6 | Bottom Nav | Products | ProductsTab | HomeTab | Yes | PASS |
| 7 | Bottom Nav | New Order | NewOrderTab | HomeTab | Yes | PASS |
| 8 | Bottom Nav | Profile | ProfileTab | HomeTab | Yes | PASS |
| 9 | Profile | My Orders | OrdersStack (MyOrders) | Profile | Yes | PASS |
| 10 | Profile | Business Updates | ProfileStack (BusinessUpdatesList) | Profile | Yes | PASS |
| 11 | Profile | Updates (Shubh Labh Updates) | ProfileStack (UpdatesList) | Profile | Yes | PASS |
| 12 | Profile | Support | ProfileStack (ComplaintCenter) | Profile | Yes | PASS |
| 13 | Profile | My Salesperson | ProfileStack (MySalesperson) | Profile | Yes | PASS |
| 14 | Products (Product Catalogue)| Shopping Cart Icon | OrdersStack (MyOrders) | Products | Yes | PASS (Fixed incorrect OrdersTab route) |
| 15 | Products (Product Catalogue)| Product Card | ProductsStack (ProductDetail) | Products | Yes | BLOCKED (No data) |
| 16 | Orders (MyOrders) | Order Card | OrdersStack (OrderDetail) | MyOrders | Yes | PASS |
| 17 | New Order (NewOrderMain) | Place Order | NewOrderStack (OrderReview) | NewOrderMain | Yes | PASS |
| 18 | Order Review (OrderReview) | Confirm Save | NewOrderStack (OrderSuccess) | N/A (Reset) | Yes | PASS |
| 19 | Order Success | View Order | OrdersStack (OrderDetail) | MyOrders | Yes | PASS |
| 20 | Order Success | Back to Home | HomeTab | N/A | Yes | PASS |
