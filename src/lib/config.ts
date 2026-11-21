export interface RuntimeConfig {
  hevyApiKey: string;
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    hevyApiKey: process.env.HEVY_API_KEY || "",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://jvasthlswvlqabecvkpc.supabase.co",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}
