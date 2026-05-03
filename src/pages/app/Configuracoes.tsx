import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User, Store as StoreIcon } from "lucide-react";

export default function Configuracoes() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: store }] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
        supabase.from("stores").select("id, name").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      ]);
      setName(profile?.name ?? "");
      setStoreId(store?.id ?? null);
      setStoreName(store?.name ?? "");
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({ name }).eq("user_id", user.id);
      if (storeId && storeName) {
        await supabase.from("stores").update({ name: storeName }).eq("id", storeId);
      }
      toast.success("Configurações salvas.");
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container max-w-2xl py-6 md:py-10 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Configurações</h1>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Perfil</h2>
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label>Seu nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como prefere ser chamado" className="min-h-12" />
        </div>
      </Card>

      {storeId && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <StoreIcon className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Sua loja</h2>
          </div>
          <div className="space-y-2">
            <Label>Nome da loja</Label>
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="min-h-12" />
          </div>
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }}>
          <LogOut className="h-4 w-4 mr-1" /> Sair
        </Button>
        <Button onClick={save} disabled={saving} className="min-h-12">
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
