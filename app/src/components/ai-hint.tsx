"use client";

import { useState, type ReactNode } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Theme = "emerald" | "orange" | "sky" | "violet";

const ACCENT_BG: Record<Theme, string> = {
  emerald: "bg-arena-emerald/10",
  orange: "bg-arena-orange/10",
  sky: "bg-arena-sky/10",
  violet: "bg-arena-violet/10",
};

const ACCENT_TEXT: Record<Theme, string> = {
  emerald: "text-arena-emerald",
  orange: "text-arena-orange",
  sky: "text-arena-sky",
  violet: "text-arena-violet",
};

const ACCENT_BORDER: Record<Theme, string> = {
  emerald: "border-arena-emerald/30",
  orange: "border-arena-orange/30",
  sky: "border-arena-sky/30",
  violet: "border-arena-violet/30",
};

export type AiHintAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "ghost";
};

export function AiHint({
  title,
  body,
  why,
  actions,
  theme = "violet",
  stub = false,
}: {
  title: string;
  body: ReactNode;
  why?: ReactNode; // expanded "Why?" content (LP Agent data that informed it)
  actions?: AiHintAction[];
  theme?: Theme;
  stub?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`${ACCENT_BG[theme]} ${ACCENT_BORDER[theme]} border`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Sparkles className={`size-4 mt-0.5 ${ACCENT_TEXT[theme]}`} aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{title}</span>
              {stub && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  heuristic
                </Badge>
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {body}
            </div>
          </div>
        </div>

        {why && expanded && (
          <div className="rounded-md bg-background/50 p-3 text-xs text-muted-foreground">
            {why}
          </div>
        )}

        {(actions?.length || why) && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions?.map((a, i) => {
              const className =
                a.variant === "ghost"
                  ? "text-xs"
                  : `text-xs ${ACCENT_TEXT[theme]}`;
              if (a.href) {
                return (
                  <Button
                    key={i}
                    size="sm"
                    variant={a.variant === "primary" ? "default" : "ghost"}
                    className={className}
                    render={<a href={a.href} />}
                    nativeButton={false}
                  >
                    {a.label}
                  </Button>
                );
              }
              return (
                <Button
                  key={i}
                  size="sm"
                  variant={a.variant === "primary" ? "default" : "ghost"}
                  className={className}
                  onClick={a.onClick}
                >
                  {a.label}
                </Button>
              );
            })}
            {why && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => setExpanded((v) => !v)}
              >
                <ChevronDown
                  className={`size-3 mr-1 transition-transform ${expanded ? "rotate-180" : ""}`}
                  aria-hidden
                />
                {expanded ? "Hide" : "Why?"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
