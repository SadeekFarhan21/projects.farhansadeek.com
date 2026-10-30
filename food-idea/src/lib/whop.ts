const WHOP_API_BASE = "https://api.whop.com/api/v5";

type WhopCheckoutConfig = {
  id: string;
  purchase_url: string;
};

export async function createWhopCheckout(params: {
  amountCents: number;
  metadata: Record<string, string>;
  redirectUrl: string;
}): Promise<WhopCheckoutConfig> {
  const res = await fetch(`${WHOP_API_BASE}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company_id: process.env.WHOP_COMPANY_ID,
      plan_type: "one_time",
      initial_price: params.amountCents,
      currency: "usd",
      metadata: params.metadata,
      redirect_url: params.redirectUrl,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Whop checkout creation failed: ${error}`);
  }

  return res.json();
}

export function verifyWhopWebhook(
  payload: string,
  signature: string
): boolean {
  // Whop webhook verification using the webhook secret
  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", process.env.WHOP_WEBHOOK_SECRET!)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
