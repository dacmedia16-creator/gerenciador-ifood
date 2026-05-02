import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Store, Trash2 } from "lucide-react";
import { seedDemoStore } from "@/lib/seed/demoStore";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Stores() {
  const [stores, setStores] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    setStores(data || []);
  };
  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    if (!user) return;
    try {
      const s = await seedDemoStore(user.id);
      toast.success("Loja demo criada!");
      navigate(`/app/stores/${s.id}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) { toast.error(`Erro ao excluir: ${error.message}`); return; }
    toast.success(`Loja "${name}" excluída`);
    setStores((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Minhas lojas</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed}><Sparkles className="h-4 w-4 mr-1" /> Criar demo</Button>
          <Button onClick={() => navigate("/app/stores/new")} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Nova loja</Button>
        </div>
      </div>
      {stores.length === 0 && <Card className="p-8 text-center"><Store className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Nenhuma loja cadastrada ainda.</p></Card>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((s) => (
          <Card key={s.id} className="p-4 shadow-card hover:shadow-elegant transition-shadow relative">
            <Link to={`/app/stores/${s.id}`} className="block pr-8">
              <h3 className="font-semibold">{s.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{s.platform} · {s.city}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Nota: <span className="font-medium text-foreground">{s.rating || "-"}</span></div>
                <div>Ticket médio: <span className="font-medium text-foreground">R$ {s.average_ticket || "-"}</span></div>
                <div>Categoria: <span className="font-medium text-foreground">{s.category || "-"}</span></div>
              </div>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Excluir loja">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir "{s.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Todos os dados relacionados a esta loja (diagnósticos, produtos, avaliações, métricas, planos) serão removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(s.id, s.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        ))}
      </div>
    </div>
  );
}
