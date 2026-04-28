export function log(scope: string, msg: string, extra?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const tail = extra ? " " + JSON.stringify(extra) : "";
  console.log(`[${ts}] [${scope}] ${msg}${tail}`);
}

export function warn(scope: string, msg: string, extra?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const tail = extra ? " " + JSON.stringify(extra) : "";
  console.warn(`[${ts}] [${scope}] ⚠ ${msg}${tail}`);
}

export function err(scope: string, msg: string, e?: unknown) {
  const ts = new Date().toISOString();
  const detail = e instanceof Error ? `${e.message}` : e ? JSON.stringify(e) : "";
  console.error(`[${ts}] [${scope}] ✗ ${msg}${detail ? " — " + detail : ""}`);
}
