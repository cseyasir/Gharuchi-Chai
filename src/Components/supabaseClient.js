import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zkayhnbaaziolxkastcp.supabase.co";
const supabaseKey = "sb_publishable_BakgrhkbnjAVMb4-ZFqLuQ_FOUFaZS1";

export const supabase = createClient(supabaseUrl, supabaseKey);