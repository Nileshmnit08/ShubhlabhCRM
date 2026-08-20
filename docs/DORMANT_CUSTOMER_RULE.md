# Dormant Customer Rule

**Dormancy Threshold:** 180 Days (Approved by Product Owner)

**Definition of a Qualifying Sale:**
A transaction is considered a qualifying sale if:
1. It is imported from Tally.
2. The `voucher_type` contains the word "sale" (case-insensitive).
3. The `amount` is greater than 0.
4. It is not a credit note (`is_credit = false`).

**Dormancy Condition:**
A customer is classified as a "Dormant Candidate" if:
1. Their `crm_status` is explicitly set to 'Active' (Leads and already-Dormant customers are excluded).
2. AND either:
   a. They have NO qualifying sales history in the Tally integration.
   b. The number of days since their last qualifying sale is strictly greater than **180 days**.

*Note: This is an identification status only. It does not automatically alter the Customer's master `crm_status` to 'Dormant', nor does it automatically spawn follow-up tasks.*
