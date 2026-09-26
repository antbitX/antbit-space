import { createServerFn } from "@tanstack/react-start";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const email =
      typeof data === "object" && data !== null
        ? (data as { email?: unknown }).email
        : null;
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      throw new Error("Enter a valid email address.");
    }
    return email.trim().toLowerCase();
  })
  .handler(async ({ data: email }): Promise<{ ok: true; duplicate: boolean }> => {
    const apiKey = process.env.BUTTONDOWN_API_KEY;
    if (!apiKey) throw new Error("Newsletter signup is not configured yet.");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch("https://api.buttondown.com/v1/subscribers", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email_address: email }),
      });
      if (res.ok) return { ok: true, duplicate: false };
      const body = await res.text().catch(() => "");
      // Buttondown returns 400 when the address is already subscribed.
      if (res.status === 400 && /already/i.test(body)) {
        return { ok: true, duplicate: true };
      }
      throw new Error("Signup failed — please try again.");
    } finally {
      clearTimeout(timer);
    }
  });
