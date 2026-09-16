const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3OTIzOTg0NCwiZXhwIjozMjY0MjMzMTk2fQ.y4pZ1L0wN1Z3Q_N_X_Y_Z'); 

// Actually, I don't have the anon key. Let's just use the Deno function logic or standard anon key if it's default.
// Let's just use psql since it's local docker.
