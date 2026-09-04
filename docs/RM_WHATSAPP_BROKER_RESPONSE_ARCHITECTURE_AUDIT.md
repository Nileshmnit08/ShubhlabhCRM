# MICRO-SPRINT RM-08: WHATSAPP BROKER RESPONSE ARCHITECTURE AUDIT

## 1. Objective and Scope
**Objective:** Design and validate the technical architecture for receiving broker WhatsApp responses before building automatic capture.

**Scope Completed:**
- Audited current CRM WhatsApp integration (currently strictly outbound via `wa.me` deep links in `WhatsAppAction.jsx` and a `whatsapp-notifier` edge function).
- Confirmed that **no incoming webhook architecture currently exists** in the CRM for broker responses.
- Drafted the required architecture to securely capture, parse, and stage incoming broker pricing messages without bypassing existing data quality rules.

## 2. Technical Architecture Design

### 2.1. Provider & Number Setup
- **Business WhatsApp Number:** An official WhatsApp Business API provider (Meta Cloud API, Twilio, or similar) is strictly required to receive webhooks. Deep-link (`wa.me`) setups cannot receive automated responses.
- **Incoming Webhook Path:** A new Supabase Edge Function (`/supabase/functions/whatsapp-webhook`) must be created to receive POST requests from the provider.

### 2.2. Payload Matching & Context
- **Broker Phone Matching:** The incoming `From` number must be normalized (stripping `+91`, spaces) using the CRM's existing `phoneUtils` logic and matched against `public.brokers.mobile` or `public.brokers.whatsapp_number`. If no match is found, the message is ignored or flagged as unknown.
- **Enquiry / Context Matching:** Since brokers often reply with just a number (e.g., "2450"), the system must check the `public.broker_materials` mapping. 
  - *Single Material:* If the broker only provides 1 material, context is automatically deduced.
  - *Multiple Materials:* Context must be extracted using NLP/LLM parsing, or the broker must be prompted to clarify.

### 2.3. Data Storage & Pipeline
- **Raw Message Storage:** A new table `public.whatsapp_incoming_messages` must be created to store the raw payload BEFORE parsing. This ensures auditability.
- **Message ID & Duplicate Handling:** The native WhatsApp Message ID (`wamid` or provider equivalent) must be saved with a `UNIQUE` constraint in the raw table to silently drop provider webhook retries.
- **Timestamp Handling:** The system must use the exact timestamp provided in the webhook payload, not the server's receive time, to accurately reflect when the broker quoted the price.

### 2.4. Processing & Security
- **Security:** The webhook endpoint must validate the cryptographic signature header (e.g., `X-Hub-Signature-256`) to ensure payloads are authentically from the WhatsApp provider.
- **Retry / Failure Handling:** If a message cannot be parsed into a valid price, or if multiple materials make context ambiguous, the raw message must be flagged with `status = 'Manual Review'` so an operator can read it and manually enter it into `DailyPriceEntry.jsx`.
- **Media Handling:** Image/Audio messages (e.g., a photo of a rate card) cannot be easily parsed for raw material prices automatically. These should be saved as raw messages and immediately flagged for `Manual Review`.

### 2.5. Insertion into CRM
- Successfully parsed prices must be inserted into `public.raw_material_price_entries` with:
  - `source = 'WhatsApp API'`
  - `status = 'Pending'` (Crucial: As established in RM-06, automated entries must never bypass human verification before entering the official dataset).

## 3. Files/Components to be Created in Future Sprints
- `supabase/functions/whatsapp-webhook/index.ts`
- `migration: 117_whatsapp_incoming_schema.sql` (for `whatsapp_incoming_messages` table)
- `app/src/pages/RawMaterialPrices/WhatsAppInbox.jsx` (UI for operators to review 'Pending' and 'Manual Review' messages)

## 4. Known Limitations & Blockers
- **Blocker for immediate implementation:** A live WhatsApp Business API account must be provisioned and configured by the Product Owner before the webhook can be actively tested.

## 5. Final Status
**PASS** - The architecture is fully defined, isolated, safe, and ready for implementation once the provider is provisioned.

STATUS:
⛔ SPRINT COMPLETE — WAITING FOR PRODUCT OWNER APPROVAL
