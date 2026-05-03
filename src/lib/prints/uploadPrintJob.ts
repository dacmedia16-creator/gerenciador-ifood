import { supabase } from "@/integrations/supabase/client";

export interface UploadPrintJobParams {
  file: File;
  userId: string;
  storeId?: string | null;
  diagnosisSessionId?: string | null;
}

export interface UploadPrintJobResult {
  jobId: string;
  storagePath: string;
}

/**
 * Faz upload do print no bucket "prints" e cria um print_job pendente.
 * O processamento é disparado fire-and-forget na edge function process-print-job.
 */
export async function uploadPrintJob({
  file,
  userId,
  storeId,
  diagnosisSessionId,
}: UploadPrintJobParams): Promise<UploadPrintJobResult> {
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${userId}/${storeId ?? "no-store"}/${crypto.randomUUID()}-${safeName}`;

  const { error: upErr } = await supabase.storage.from("prints").upload(path, file, {
    contentType: file.type || "image/png",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: job, error: insErr } = await supabase
    .from("print_jobs")
    .insert({
      user_id: userId,
      store_id: storeId ?? null,
      diagnosis_session_id: diagnosisSessionId ?? null,
      storage_path: path,
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !job) throw insErr ?? new Error("Falha ao criar job");

  // Dispara processamento sem bloquear
  supabase.functions
    .invoke("process-print-job", { body: { job_id: job.id } })
    .catch((e) => console.warn("process-print-job invoke", e));

  return { jobId: job.id, storagePath: path };
}
