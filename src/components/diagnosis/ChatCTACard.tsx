import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";

const SAMPLE_QUESTIONS = [
  "Como reduzo cancelamento?",
  "Por onde começo sem equipe?",
  "Quanto tempo para a nota subir?",
];

interface Props {
  diagnosisId: string;
}

export function ChatCTACard({ diagnosisId }: Props) {
  const navigate = useNavigate();
  const goChat = (q?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (diagnosisId) params.set("diagnosis", diagnosisId);
    navigate(`/app/chat?${params.toString()}`);
  };
  return (
    <Card className="p-5 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex items-start gap-3">
        <MessageSquare className="h-5 w-5 text-blue-700 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">Ficou com dúvida sobre o plano?</h3>
          <p className="text-sm text-blue-900/80 mb-3">
            O consultor IA conhece sua loja e pode responder em segundos.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {SAMPLE_QUESTIONS.map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                className="bg-white/70 border-blue-200 text-blue-900 hover:bg-white"
                onClick={() => goChat(q)}
              >
                {q}
              </Button>
            ))}
          </div>
          <Button onClick={() => goChat()} className="bg-blue-700 hover:bg-blue-800 text-white">
            Conversar com o consultor <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
