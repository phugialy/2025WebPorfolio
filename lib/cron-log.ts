import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function logCronRun(job: string, ok: boolean, summary: unknown): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  try {
    await supabase.from("cron_runs").insert({ job, ok, summary });
  } catch (error) {
    console.error(`Failed to log cron run for ${job}:`, error);
  }
}
