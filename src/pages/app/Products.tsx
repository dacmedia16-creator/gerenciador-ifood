import { useParams } from "react-router-dom";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, ImageOff, Image, Package } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Link } from "react-router-dom";

export default function Products() {
  const { id } = useParams();
  const { products, loading, reload } = useStoreData(id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", category: "", sale_price: "", food_cost: "", packaging_cost: "", platform_fee_percent: 23, sales_quantity: 0, has_photo: false });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const margin = form.sale_price ? Math.round(((form.sale_price - (Number(form.food_cost) || 0) - (Number(form.packaging_cost) || 0) - (form.sale_price * (Number(form.platform_fee_percent) || 0) / 100)) / form.sale_price) * 100) : 0;
    const { error } = await supabase.from("products").insert({ ...form, store_id: id, estimated_margin: margin, is_active: true });
    if (error) return toast.error(error.message);
    toast.success("Produto adicionado");
    setOpen(false);
    setForm({ name: "", category: "", sale_price: "", food_cost: "", packaging_cost: "", platform_fee_percent: 23, sales_quantity: 0, has_photo: false });
    reload();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Button onClick={() => setOpen(!open)} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </div>

      {open && (
        <Card className="p-4 shadow-card">
          <form onSubmit={save} className="grid md:grid-cols-3 gap-3">
            <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Preço venda</Label><Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></div>
            <div><Label>Custo do produto</Label><Input type="number" step="0.01" value={form.food_cost} onChange={(e) => setForm({ ...form, food_cost: e.target.value })} /></div>
            <div><Label>Custo embalagem</Label><Input type="number" step="0.01" value={form.packaging_cost} onChange={(e) => setForm({ ...form, packaging_cost: e.target.value })} /></div>
            <div><Label>Taxa plataforma %</Label><Input type="number" step="0.1" value={form.platform_fee_percent} onChange={(e) => setForm({ ...form, platform_fee_percent: e.target.value })} /></div>
            <div><Label>Qtd vendas/mês</Label><Input type="number" value={form.sales_quantity} onChange={(e) => setForm({ ...form, sales_quantity: e.target.value })} /></div>
            <div className="flex items-end gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_photo} onChange={(e) => setForm({ ...form, has_photo: e.target.checked })} /> Tem foto</label></div>
            <div className="md:col-span-3 flex justify-end"><Button type="submit">Salvar</Button></div>
          </form>
        </Card>
      )}

      {(!products || products.length === 0) ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          description="Adicione produtos manualmente ou importe um CSV do seu cardápio."
          action={<Button asChild variant="outline"><Link to={`/app/stores/${id}/uploads`}>Importar CSV</Link></Button>}
        />
      ) : (
      <Card className="shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr><th className="p-3 text-left">Produto</th><th>Categoria</th><th>Preço</th><th>Custo</th><th>Margem</th><th>Vendas</th><th>Recl.</th><th>Foto</th></tr>
          </thead>
          <tbody>
            {products?.map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="text-center text-muted-foreground">{p.category}</td>
                <td className="text-center">R$ {p.sale_price}</td>
                <td className="text-center">R$ {p.food_cost}</td>
                <td className={`text-center font-semibold ${(p.estimated_margin || 0) < 25 ? "text-destructive" : "text-success"}`}>{p.estimated_margin}%</td>
                <td className="text-center">{p.sales_quantity}</td>
                <td className="text-center">{p.complaints_count || 0}</td>
                <td className="text-center">{p.has_photo ? <Image className="h-4 w-4 mx-auto text-success" /> : <ImageOff className="h-4 w-4 mx-auto text-destructive" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      )}
    </div>
  );
}
