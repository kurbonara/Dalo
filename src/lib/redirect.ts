import { redirect } from "next/navigation";

function withParam(path: string, key: string, value: string) {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("error");
  params.delete("message");
  params.set(key, value);
  return `${base}?${params.toString()}`;
}

/** Redirect back to `path` with an error banner. */
export function fail(path: string, message: string): never {
  redirect(withParam(path, "error", message));
}

/** Redirect to `path` with a success banner. */
export function succeed(path: string, message: string): never {
  redirect(withParam(path, "message", message));
}

/** Only allow same-site relative redirects. */
export function safeNext(next: FormDataEntryValue | string | null | undefined, fallback = "/tickets") {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
