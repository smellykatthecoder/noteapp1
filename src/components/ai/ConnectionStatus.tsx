"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

interface StatusResponse {
  ok: boolean;
  provider?: string;
  model?: string;
  message?: string;
}

export function ConnectionStatus() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((data: StatusResponse) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setStatus({ ok: false, message: "Could not reach the server" });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking AI connection...
      </div>
    );
  }

  if (status?.ok) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>
          AI connected ({status.provider}, {status.model})
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-100">
      <div className="mb-1 flex items-center gap-2 font-medium">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        AI not connected
      </div>
      <p className="text-red-200/80">
        {status?.message ??
          "Add GEMINI_API_KEY to .env.local and restart the dev server (npm run dev)."}
      </p>
    </div>
  );
}
