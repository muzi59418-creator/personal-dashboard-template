import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isCloudModeEnabled = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isCloudModeEnabled
  ? createClient(supabaseUrl as string, supabasePublishableKey as string)
  : null;
