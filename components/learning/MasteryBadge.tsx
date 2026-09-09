import { TrendingUp, Sparkles, CircleDashed, Activity, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { MASTERY_LABEL_TEXT } from "@/lib/learning/mastery";
import type { MasterySignal } from "@/lib/learning/types";

const META = {
  "not-enough-data": { tone: "neutral" as const, Icon: CircleDashed },
  learning: { tone: "primary" as const, Icon: GraduationCap },
  improving: { tone: "success" as const, Icon: TrendingUp },
  strong: { tone: "success" as const, Icon: Sparkles },
  active: { tone: "primary" as const, Icon: Activity },
};

export function MasteryBadge({ signal }: { signal: MasterySignal }) {
  const { tone, Icon } = META[signal.label];
  return (
    <Badge tone={tone}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {MASTERY_LABEL_TEXT[signal.label]}
      {signal.score !== null && signal.label !== "not-enough-data" && (
        <span className="opacity-70">· {signal.score}%</span>
      )}
    </Badge>
  );
}
