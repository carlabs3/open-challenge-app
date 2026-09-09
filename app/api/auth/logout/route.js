import { clearSessionCookie } from "@/lib/session";
import { handler, json } from "@/lib/http";

export const POST = handler(async () => {
  clearSessionCookie();
  return json({ ok: true });
});
