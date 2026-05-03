import { supabase } from "@/integrations/supabase/client";

interface DiagItem {
  name?: string;
  category?: string;
  sale_price?: number | null;
  food_cost?: number | null;
  packaging_cost?: number | null;
  platform_fee_percent?: number | null;
  sales_quantity?: number | null;
  has_photo?: boolean;
  has_description?: boolean;
  has_complaints?: boolean;
  notes?: string;
}

/**
 * Sincroniza os produtos cadastrados na etapa de diagnóstico ("products")
 * para a tabela `products` da loja. Faz match por (store_id, name).
 */
export async function syncDiagnosisProductsToStore(
  storeId: string,
  items: DiagItem[],
): Promise<void> {
  if (!storeId || !Array.isArray(items)) return;

  const valid = items.filter((p) => p && p.name && p.name.trim().length > 0);
  if (valid.length === 0) return;

  const { data: existing } = await supabase
    .from("products")
    .select("id, name")
    .eq("store_id", storeId);

  const byName = new Map<string, string>();
  for (const p of existing || []) {
    if (p.name) byName.set(p.name.trim().toLowerCase(), p.id);
  }

  for (const item of valid) {
    const key = item.name!.trim().toLowerCase();
    const payload: any = {
      store_id: storeId,
      name: item.name!.trim(),
      category: item.category || null,
      sale_price: item.sale_price ?? null,
      food_cost: item.food_cost ?? null,
      packaging_cost: item.packaging_cost ?? null,
      platform_fee_percent: item.platform_fee_percent ?? null,
      sales_quantity: item.sales_quantity ?? 0,
      has_photo: !!item.has_photo,
      complaints_count: item.has_complaints ? 1 : 0,
      description: item.notes || null,
      is_active: true,
    };

    const existingId = byName.get(key);
    if (existingId) {
      await supabase.from("products").update(payload).eq("id", existingId);
    } else {
      await supabase.from("products").insert(payload);
    }
  }
}
