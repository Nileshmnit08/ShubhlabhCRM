# Micro-Sprint 9.1: Change Plan

## Database Changes

### Tables to Modify
| Table / View | Modification | Reason |
| --- | --- | --- |
| `follow_ups` | Add `follow_up_type` VARCHAR (Default 'General') | To categorize and filter Payment follow-ups vs Sales/General follow-ups. |
| `follow_ups` | Add `amount_promised` DECIMAL | To track partial or full payment commitments made by the customer. |
| `follow_ups` | Add `promise_date` DATE | To track when the customer committed to make the payment. |
| `v_today_followups` (View) | Include `follow_up_type`, `amount_promised`, `promise_date`, and `outstanding_balance` | To display payment context on the Today's Work dashboard. |
| `v_overdue_followups` (View)| Include `follow_up_type`, `amount_promised`, `promise_date`, and `outstanding_balance` | To display payment context for overdue items. |
| `interactions` | Add `outcome_type` or use existing `interaction_type` | Ensure standard values like 'Payment Promised' can be recorded clearly. |

### Tables to Create
None. The existing structure (`follow_ups` and `interactions`) is sufficient to handle the workflow with minor column additions.

## UI/Component Changes

### Components to Modify
| Component | Modification | Reason |
| --- | --- | --- |
| `FollowUpModal` | Add `follow_up_type` dropdown. If 'Payment' is selected, show optional `amount_promised` and `promise_date` inputs. | To capture specialized data when scheduling a payment follow-up. |
| `InteractionModal` | Add payment-specific outcomes (e.g., 'Promised to Pay'). | To standardized the recording of payment collection efforts. |
| `TodaysWorkDashboard` | Add a filter/tab for "Payment Follow-ups" and display the `outstanding_balance` on the follow-up cards. | To allow operators to focus specifically on collections. |
| `CustomerProfile` | Highlight existing `outstanding_balance` and provide a "Schedule Payment Reminder" quick-action. | To improve user efficiency when reviewing accounts in debit. |

### Components to Create
| Component | Purpose | Reason |
| --- | --- | --- |
| `WhatsAppPaymentTemplate` | A pre-configured text template generator for payments (e.g. "Dear [Name], your balance is [Amount]..."). | To standardize outbound communication for collections using the existing `wa.me` deep-linking. |

## APIs/Services to Modify
| API / Service | Modification | Reason |
| --- | --- | --- |
| `Supabase REST API` | No major logic changes needed; ensure new columns are exposed correctly. | The front-end can interact directly with the new columns via the standard Supabase client. |
