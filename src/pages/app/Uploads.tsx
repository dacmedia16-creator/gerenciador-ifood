import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { PrintUploader } from "@/components/diagnosis/PrintUploader";
import { LoadingState } from "@/components/LoadingState";
import { getOrCreateUserSession } from "@/lib/diagnosis/session";

export default function Uploads() {
  const { id } = useParams();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const s = await getOrCreateUserSession(user.id, id);
      setSessionId(s.id);
    })();
  }, [user, id]);

  if (!sessionId) return <LoadingState />;

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Envie prints da sua loja</h1>
        <p className="text-sm text-muted-foreground">
          iFood, 99Food, WhatsApp, Instagram, cardápio, avaliações, indicadores, faturamento. A IA lê cada print e extrai os dados.
        </p>
      </div>
      <Card className="p-5">
        <PrintUploader sessionId={sessionId} storeId={id} />
      </Card>
    </div>
  );
}
