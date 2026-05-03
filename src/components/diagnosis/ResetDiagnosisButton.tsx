import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  storeId?: string | null;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  redirectTo?: string;
  label?: string;
}

export function ResetDiagnosisButton({
  storeId,
  variant = "outline",
  size = "default",
  redirectTo,
  label = "Resetar diagnóstico",
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!storeId || !user) {
      toast.error("Loja não identificada");
      return;
    }
    setResetting(true);
    try {
      const { data: sessions } = await supabase
        .from("diagnosis_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("store_id", storeId);
      const sessionIds = (sessions || []).map((s) => s.id);

      if (sessionIds.length) {
        await supabase.from("diagnosis_step_status").delete().in("session_id", sessionIds);
        await supabase.from("diagnosis_answers").delete().in("session_id", sessionIds);
        await supabase.from("diagnosis_sessions").delete().in("id", sessionIds);
      }

      await supabase.from("action_plans").delete().eq("store_id", storeId);
      await supabase.from("diagnostics").delete().eq("store_id", storeId);
      await supabase.from("reports").delete().eq("store_id", storeId);

      toast.success("Diagnóstico resetado. Você pode começar do zero.");
      navigate(redirectTo || `/app/stores/${storeId}/dashboard`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao resetar diagnóstico");
    } finally {
      setResetting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={resetting || !storeId}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetar diagnóstico desta loja?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso apaga as respostas do funil, diagnósticos gerados, planos de ação
            e relatórios desta loja. Os dados da loja, produtos, métricas e
            avaliações continuam intactos. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset} disabled={resetting}>
            {resetting ? "Resetando…" : "Sim, resetar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
