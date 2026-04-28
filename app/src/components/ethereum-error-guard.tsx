"use client";

import { useEffect } from "react";

export function EthereumErrorGuard() {
  useEffect(() => {
    const isEthereumRedefine = (msg: unknown) =>
      typeof msg === "string" &&
      msg.includes("Cannot redefine property: ethereum");

    const onError = (e: ErrorEvent) => {
      if (isEthereumRedefine(e.message)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as { message?: unknown } | undefined;
      if (isEthereumRedefine(reason?.message)) {
        e.preventDefault();
      }
    };

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
