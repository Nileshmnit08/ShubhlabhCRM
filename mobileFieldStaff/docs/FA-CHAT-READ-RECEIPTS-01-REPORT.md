# FA-CHAT-READ-RECEIPTS-01-REPORT

## 1. Existing chat schema audit
I reviewed the existing chat schema in `mobileFieldStaff/app/docs/chat_schema.sql` and the live queries.
- **`chat_conversations`**: `id`, `created_at`, `updated_at`
- **`chat_participants`**: `id`, `conversation_id`, `user_id`, `joined_at`
- **`chat_messages`**: `id`, `conversation_id`, `sender_id`, `message_text`, `created_at`, `read_at`

## 2. Exact Schema Gap
The existing database **DOES NOT** fully support the required WhatsApp-style states (SENT -> DELIVERED -> SEEN).
- **Missing Capability**: There is no `delivered_at` field anywhere in the schema.
- **Missing Capability**: There is no participant-level read watermark (e.g., `chat_participants.last_read_at`), which is the preferred performant method according to the requirements.

## 3. Proposed Minimal Migration
Instead of adding `delivered_at` to every single message in `chat_messages` (which requires one UPDATE per message, reducing performance), I propose adding two watermark columns to `chat_participants`. This perfectly fulfills the "Preferred Read Model" and "Performance" constraints.

**Migration Name**: `148_sprint_FA_CHAT_READ_RECEIPTS_schema.sql` (or similar sequence)

**Table**: `public.chat_participants`

**New Columns**:
- `last_delivered_at` (`TIMESTAMP WITH TIME ZONE`)
- `last_read_at` (`TIMESTAMP WITH TIME ZONE`)

**RLS Implications**:
- We must add an `UPDATE` policy on `chat_participants` so users can update their own `last_delivered_at` and `last_read_at` timestamps:
  ```sql
  CREATE POLICY "Users can update their own participant state" 
  ON public.chat_participants
  FOR UPDATE USING (user_id = auth.uid());
  ```

This allows the UI to derive state efficiently:
- `✓` (SENT): `message.created_at > other_participant.last_delivered_at`
- `✓✓` (DELIVERED): `message.created_at <= other_participant.last_delivered_at AND message.created_at > other_participant.last_read_at`
- `✓✓ BLUE` (SEEN): `message.created_at <= other_participant.last_read_at`

## 4. Final Status
Because the schema does not support `delivered_at`, I have stopped before migrating as instructed.

**BLOCKED - AWAITING SCHEMA MIGRATION APPROVAL**
