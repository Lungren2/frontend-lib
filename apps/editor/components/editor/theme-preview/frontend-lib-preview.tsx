"use client";

import { ui } from "@frontend-lib/registry";
import { useEffect, useMemo, useState } from "react";

import {
  createFrontendLibPreviewStyle,
  createFrontendLibTheme,
} from "@/lib/frontend-lib/theme-adapter";
import type { ThemeEditorPreviewProps } from "@/types/theme";

type Change = {
  action: "create" | "update" | "delete";
  path: string;
};

type EngineResponse = {
  changes: Change[];
  warnings: string[];
  target: string;
};

type ThemePlan = EngineResponse & {
  planId: string;
};

async function readResponse(response: Response) {
  const body = (await response.json()) as EngineResponse & {
    error?: string;
    planId?: string;
  };
  if (!response.ok) throw new Error(body.error ?? "The engine request failed.");
  return body;
}

export default function FrontendLibPreview({
  styles,
  currentMode,
}: ThemeEditorPreviewProps) {
  const theme = useMemo(() => createFrontendLibTheme(styles), [styles]);
  const previewStyle = useMemo(
    () => createFrontendLibPreviewStyle(theme, currentMode),
    [currentMode, theme],
  );
  const [plan, setPlan] = useState<ThemePlan | null>(null);
  const [pending, setPending] = useState<"plan" | "apply" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlan(null);
    setMessage(null);
  }, [theme]);

  const requestPlan = async () => {
    setPending("plan");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/frontend-lib/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "plan", theme }),
      });
      const nextPlan = await readResponse(response);
      if (!nextPlan.planId)
        throw new Error("The engine returned an invalid plan.");
      setPlan({ ...nextPlan, planId: nextPlan.planId });
      setMessage(
        nextPlan.changes.length === 0
          ? "The target already matches this theme."
          : "Plan ready for review.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The plan failed.",
      );
    } finally {
      setPending(null);
    }
  };

  const applyPlan = async () => {
    if (!plan) return;
    setPending("apply");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/frontend-lib/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          theme,
          expectedPlanId: plan.planId,
        }),
      });
      const result = await readResponse(response);
      setPlan(null);
      setMessage(
        result.changes.length === 0
          ? "No filesystem changes were needed."
          : "Theme applied through the Frontend Lib engine.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The apply failed.",
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="min-h-full p-4 sm:p-6" style={previewStyle}>
      <div className="mx-auto grid max-w-4xl gap-6">
        <section aria-labelledby="frontend-lib-buttons" className="grid gap-4">
          <div>
            <h2 id="frontend-lib-buttons" className="text-base font-semibold">
              Button
            </h2>
            <p className="text-muted-foreground text-sm">
              Canonical registry source using the current editor tokens.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ui.button>Primary button</ui.button>
            <ui.button variant="secondary">Secondary button</ui.button>
            <ui.button variant="ghost">Ghost button</ui.button>
            <ui.button size="small">Small button</ui.button>
            <ui.button disabled>Disabled button</ui.button>
            <ui.button variant="secondary">
              A button with deliberately long content
            </ui.button>
          </div>
        </section>

        <section
          aria-labelledby="frontend-lib-plan"
          className="grid gap-4 border-t pt-5"
        >
          <div>
            <h2 id="frontend-lib-plan" className="text-base font-semibold">
              Consumer theme
            </h2>
            <p className="text-muted-foreground text-sm">
              Review the deterministic filesystem plan before the engine applies
              it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ui.button onClick={requestPlan} disabled={pending !== null}>
              {pending === "plan" ? "Generating plan…" : "Generate engine plan"}
            </ui.button>
            <ui.button
              variant="secondary"
              onClick={applyPlan}
              disabled={!plan || pending !== null || plan.changes.length === 0}
            >
              {pending === "apply" ? "Applying…" : "Apply engine plan"}
            </ui.button>
          </div>

          {plan && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="sr-only">Frontend Lib engine plan</caption>
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.changes.map((change) => (
                    <tr key={change.path} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs uppercase">
                        {change.action}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {change.path}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-muted-foreground border-t px-3 py-2 font-mono text-xs">
                Target: {plan.target}
              </p>
            </div>
          )}

          {plan?.warnings.map((warning) => (
            <p
              key={warning}
              role="alert"
              className="text-sm text-amber-700 dark:text-amber-300"
            >
              {warning}
            </p>
          ))}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          {message && (
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {message}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
