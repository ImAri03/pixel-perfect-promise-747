import { useRef, useState } from "react";
import { Sparkles, RotateCw } from "lucide-react";
import { streamAI } from "@/services/ai";
import { isAiConfigured, config } from "@/config/app";
import { Button } from "./ui";

/** Reusable AI analysis panel: idle → generating → streaming → done | error. */
export function AIPanel({ task, context, title = "Meridian Intelligence", cta = "Generate", sentiment, compact }) {
  const [state, setState] = useState("idle");
  const [text, setText] = useState("");
  const [at, setAt] = useState(null);
  const ctrl = useRef(null);

  const run = async () => {
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setText("");
    setState("generating");
    try {
      await streamAI(task, typeof context === "function" ? context() : context, (t) => { setState("streaming"); setText(t); }, ctrl.current.signal);
      setState("done");
      setAt(new Date());
    } catch {
      setState("error");
    }
  };

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="eyebrow">{title}</span>
          {sentiment && state === "done" && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">{sentiment}</span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {isAiConfigured() ? config.aiModel : "Preview mode"}
          {at && ` · ${at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
        </span>
      </div>
      {state === "idle" && (
        <div className="flex flex-col items-start gap-3">
          {!compact && <p className="text-sm text-muted-foreground">A calm, analyst-style read on the data in front of you.</p>}
          <Button variant="gold" size="sm" onClick={run}><Sparkles className="h-3.5 w-3.5" />{cta}</Button>
        </div>
      )}
      {state === "generating" && (
        <div className="space-y-2">
          <div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-5/6" /><div className="skeleton h-3 w-2/3" />
        </div>
      )}
      {(state === "streaming" || state === "done") && (
        <p className="font-serif text-[15px] leading-relaxed">
          {text}
          {state === "streaming" && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-gold align-middle" />}
        </p>
      )}
      {state === "done" && (
        <Button variant="ghost" size="sm" className="mt-3 -ml-2" onClick={run}><RotateCw className="h-3.5 w-3.5" />Regenerate</Button>
      )}
      {state === "error" && (
        <div className="text-sm text-negative">
          Couldn't generate analysis. <button className="underline" onClick={run}>Retry</button>
        </div>
      )}
    </div>
  );
}
