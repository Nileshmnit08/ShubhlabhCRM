# FA-CHAT-READ-RECEIPTS-02-MIGRATION-REPORT

## 1. Existing schema verification
Verified `public.chat_participants` in `app/docs/chat_schema.sql`.
- Current columns: `id`, `conversation_id`, `user_id`, `joined_at`
- Unique constraint: `UNIQUE(conversation_id, user_id)`
- RLS Policies currently only allow `SELECT` and `INSERT`. There was no existing `UPDATE` policy.

## 2. Migration filename
`148_sprint_FA_CHAT_READ_RECEIPTS_schema.sql`

## 3. Columns added
- `last_delivered_at timestamptz NULL`
- `last_read_at timestamptz NULL`

## 4. Exact RLS/security mechanism
Added an RLS `UPDATE` policy that restricts updates to the authenticated user's own row (`USING (user_id = auth.uid())`).
Because Postgres RLS `UPDATE` policies restrict *which rows* can be updated (not which columns), a `BEFORE UPDATE` trigger (`enforce_participant_identity`) was added to safely lock down the core identity columns. The trigger forcefully resets `id`, `conversation_id`, `user_id`, and `joined_at` to their `OLD` values on every update, ensuring that a user can only alter `last_delivered_at` and `last_read_at`.

## 5. Security validation
- **A. Staff A can update their own receipt watermark**: Yes, the RLS policy `USING (user_id = auth.uid())` permits this.
- **B. Staff A cannot update Staff B's receipt watermark**: Yes, RLS prevents them from updating any row where `user_id != auth.uid()`.
- **C. Staff A cannot change their own user_id**: Yes, the `BEFORE UPDATE` trigger resets `NEW.user_id = OLD.user_id`.
- **D. Staff A cannot change conversation_id**: Yes, the trigger resets `NEW.conversation_id = OLD.conversation_id`.
- **E. Staff A cannot change joined_at**: Yes, the trigger resets `NEW.joined_at = OLD.joined_at`.
- **F. Mobile client does not require service-role credentials**: Yes, standard `authenticated` role is sufficient because of the RLS policy.
- **G. Existing chat SELECT/INSERT behavior remains intact**: Yes, no existing policies were dropped or modified, only an `UPDATE` policy was added.

## 6. Index review
No additional indexes were added. The `chat_participants` table already possesses a `UNIQUE(conversation_id, user_id)` constraint, which implicitly creates a unique index in PostgreSQL. When the app fetches participants for a specific `conversation_id` to evaluate read/delivered states, it utilizes the existing foreign key index and unique index. It is highly performant.

## 7. Backward compatibility
100% backward compatible. Both new columns are `NULL` by default. Existing rows remain untouched and represent "No delivery/read state recorded yet". No historical data was fabricated or modified.

## 8. Files changed
- Added `148_sprint_FA_CHAT_READ_RECEIPTS_schema.sql`

## 9. Database objects changed
- Table: `public.chat_participants`
- Policy: `"Users can update their own receipt watermarks"`
- Function: `public.protect_chat_participant_identity()`
- Trigger: `enforce_participant_identity`

## 10. Any limitations
The schema explicitly supports participant-level receipt watermarks, which enables a participant to broadcast "I have seen up to this timestamp". It avoids modifying `chat_messages`, which preserves performance by completely eliminating `UPDATE` storms on the messages table itself.

## 11. Exact next-step requirements
In the next sprint (mobile code implementation):
1. The app must broadcast a change to `last_delivered_at` to the database (via Supabase update) as soon as messages are received locally.
2. The app must broadcast a change to `last_read_at` when the conversation is actively viewed.
3. The UI must evaluate message states against the *other participant's* `last_delivered_at` and `last_read_at`.
