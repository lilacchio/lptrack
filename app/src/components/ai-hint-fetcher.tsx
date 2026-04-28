"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AiHint, type AiHintAction } from "@/components/ai-hint";

type Theme = "emerald" | "orange" | "sky" | "violet";

export type AiHintFetcherProps<TResp> = {
  endpoint: string; // e.g. "/api/ai/coach"
  body: unknown;
  title: string;
  theme?: Theme;
  // Render the body of the hint from the API response.
  render: (resp: TResp) => { body: ReactNode; why?: ReactNode };
  actions?: AiHintAction[];
  testId?: string;
  // Skip the fetch entirely — useful when prerequisites aren't available yet
  // (e.g., no rivals to summarize).
  enabled?: boolean;
};

export function AiHintFetcher<TResp extends { stub?: boolean } = { stub?: boolean }>({
  endpoint,
  body,
  title,
  theme = "violet",
  render,
  actions,
  testId,
  enabled = true,
}: AiHintFetcherProps<TResp>) {
  const [state, setState] = useState<{
    loading: boolean;
    data: TResp | null;
    error: string | null;
  }>({ loading: enabled, data: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
      .then(async (r) => {
        const json = (await r.json()) as TResp & { error?: string };
        if (cancelled) return;
        if (!r.ok || json.error) {
          setState({
            loading: false,
            data: null,
            error: json.error ?? `HTTP ${r.status}`,
          });
          return;
        }
        setState({ loading: false, data: json, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          loading: false,
          data: null,
          error: err instanceof Error ? err.message : "unknown",
        });
      });
    return () => {
      cancelled = true;
    };
    // body is stringified above; we re-fetch when the JSON shape changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, JSON.stringify(body), enabled]);

  if (!enabled) return null;

  if (state.loading) {
    return (
      <AiHint
        title={title}
        theme={theme}
        body={
          <span
            data-testid={testId ? `${testId}-loading` : undefined}
            className="font-mono text-xs text-muted-foreground"
          >
            asking the model…
          </span>
        }
      />
    );
  }

  if (state.error) {
    return (
      <AiHint
        title={title}
        theme={theme}
        stub
        body={
          <span
            data-testid={testId ? `${testId}-error` : undefined}
            className="text-xs text-destructive"
          >
            {state.error}
          </span>
        }
      />
    );
  }

  if (!state.data) return null;
  const rendered = render(state.data);
  return (
    <div data-testid={testId}>
      <AiHint
        title={title}
        theme={theme}
        stub={!!state.data.stub}
        body={rendered.body}
        why={rendered.why}
        actions={actions}
      />
    </div>
  );
}
