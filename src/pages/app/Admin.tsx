import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, Trash2, Target, MessageSquare, BookOpen, Users, Store, Stethoscope } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";

export default function Admin() {
  const { isAdmin, loading } = useIsAdmin();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", makeAdmin: false });
  const [submitting, setSubmitting] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["adminStats"],
    enabled: isAdmin,
    queryFn: async () => {
      const [u, s, d, p] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("stores").select("id", { count: "exact", head: true }),
        supabase.from("diagnostics").select("id", { count: "exact", head: true }),
        supabase.from("prospects").select("id", { count: "exact", head: true }),
      ]);
      return { users: u.count || 0, stores: s.count || 0, diagnostics: d.count || 0, prospects: p.count || 0 };
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["adminUsers"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: stores }] = await Promise.all([
        supabase.from("profiles").select("user_id, name, email, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("stores").select("user_id"),
      ]);
      const adminSet = new Set((roles || []).filter(r => r.role === "admin").map(r => r.user_id));
      const storeCount = new Map<string, number>();
      (stores || []).forEach(s => storeCount.set(s.user_id, (storeCount.get(s.user_id) || 0) + 1));
      return (profiles || []).map(p => ({
        ...p,
        is_admin: adminSet.has(p.user_id),
        stores_count: storeCount.get(p.user_id) || 0,
      }));
    },
  });

  if (loading) return <LoadingState />;
  if (!isAdmin) return <Navigate to="/app/dashboard" replace />;

  const createUser = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast({ title: "Usuário criado", description: form.email });
      setOpen(false);
      setForm({ email: "", password: "", name: "", makeAdmin: false });
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAdmin = async (user_id: string, isAdmin: boolean) => {
    const { data, error } = await supabase.functions.invoke("admin-set-role", {
      body: { user_id, role: "admin", action: isAdmin ? "remove" : "add" },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["adminUsers"] });
  };

  const deleteUser = async (user_id: string) => {
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id } });
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Usuário removido" });
    qc.invalidateQueries({ queryKey: ["adminUsers"] });
    qc.invalidateQueries({ queryKey: ["adminStats"] });
  };

  const KPI = ({ icon: Icon, label, value }: any) => (
    <Card className="p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Icon className="h-5 w-5" /></div>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel Super Admin</h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários e ferramentas administrativas.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Users} label="Usuários" value={stats?.users ?? "-"} />
        <KPI icon={Store} label="Lojas" value={stats?.stores ?? "-"} />
        <KPI icon={Stethoscope} label="Diagnósticos" value={stats?.diagnostics ?? "-"} />
        <KPI icon={Target} label="Prospects" value={stats?.prospects ?? "-"} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Button asChild variant="outline" className="h-auto py-4 justify-start">
          <Link to="/app/prospects"><Target className="h-5 w-5 mr-2" /><div className="text-left"><div className="font-semibold">Radar de Prospects</div><div className="text-xs text-muted-foreground">Buscar leads</div></div></Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 justify-start">
          <Link to="/app/chat"><MessageSquare className="h-5 w-5 mr-2" /><div className="text-left"><div className="font-semibold">Gestor IA (Chat)</div><div className="text-xs text-muted-foreground">Consultor IA</div></div></Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 justify-start">
          <Link to="/app/knowledge"><BookOpen className="h-5 w-5 mr-2" /><div className="text-left"><div className="font-semibold">Base de conhecimento</div><div className="text-xs text-muted-foreground">Treinar a IA</div></div></Link>
        </Button>
      </div>

      <Card className="p-4 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Usuários ({users.length})</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Criar usuário</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar novo usuário</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Senha temporária</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="mín. 6 caracteres" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.makeAdmin} onChange={(e) => setForm({ ...form, makeAdmin: e.target.checked })} /> Tornar administrador</label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={createUser} disabled={submitting || !form.email || form.password.length < 6}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Papel</TableHead><TableHead>Lojas</TableHead><TableHead>Criado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.name || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.is_admin ? <Badge>Admin</Badge> : <Badge variant="secondary">Usuário</Badge>}</TableCell>
                  <TableCell>{u.stores_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u.user_id, u.is_admin)} title={u.is_admin ? "Remover admin" : "Tornar admin"}>
                      <Shield className={`h-4 w-4 ${u.is_admin ? "text-primary" : ""}`} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação é irreversível e remove o usuário {u.email} e todos os dados associados.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteUser(u.user_id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
