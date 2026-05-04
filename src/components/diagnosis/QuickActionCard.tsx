import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock } from "lucide-react";

interface Props {
  day1: any | null;
}

export function QuickActionCard({ day1 }: Props) {
  if (!day1) return null;
  const steps: string[] = Array.isArray(day1.steps) ? day1.steps : [];
  const time = day1.time_minutes ? `${day1.time_minutes} min` : "10 minutos";
  return (
    <Card className="p-5 border-2 border-green-300 bg-green-50 shadow-md">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge className="bg-green-600 hover:bg-green-600 text-white text-[11px] flex items-center gap-1">
          <Zap className="h-3 w-3" /> FAÇA AGORA — {time}
        </Badge>
      </div>
      <h3 className="text-lg font-bold text-green-900 mb-3">{day1.title}</h3>
      {steps.length > 0 && (
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-green-900/90 mb-3">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        {day1.time_minutes ? (
          <Badge variant="secondary" className="text-[10px]">
            <Clock className="h-3 w-3 mr-1" />
            {day1.time_minutes} min
          </Badge>
        ) : null}
      </div>
      {day1.expected_impact && (
        <p className="text-success italic text-sm mt-3">
          Resultado esperado: {day1.expected_impact}
        </p>
      )}
    </Card>
  );
}
