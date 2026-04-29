// Test giả lập callback từ Checkout SDK Server.
// Run: ZMP_CHECKOUT_PRIVATE_KEY=xxx ORDER_ID=<uuid> node scripts/test-payment-webhook.mjs
//
// Yêu cầu:
//   - Đã deploy edge function payment-webhook
//   - Đã set secret ZMP_CHECKOUT_PRIVATE_KEY trên Supabase (cùng giá trị)
//   - Có 1 order trong DB ở trạng thái payment_status='unpaid', total khớp AMOUNT bên dưới

import { createHmac } from "node:crypto";

const WEBHOOK_URL =
  process.env.WEBHOOK_URL ??
  "https://nhsshlpvcqudxdroxzsw.supabase.co/functions/v1/payment-webhook";

const privateKey = process.env.ZMP_CHECKOUT_PRIVATE_KEY;
const orderId = process.env.ORDER_ID; // UUID của orders trong DB
const amount = Number(process.env.AMOUNT ?? 50000);
const resultCode = Number(process.env.RESULT_CODE ?? 1);

if (!privateKey || !orderId) {
  console.error("Missing ZMP_CHECKOUT_PRIVATE_KEY hoặc ORDER_ID env");
  process.exit(1);
}

const data = {
  appId: "test-app",
  orderId: `zmp_${Date.now()}`,
  transId: `trans_${Date.now()}`,
  method: "ZALOPAY_SANDBOX",
  transTime: Date.now(),
  merchantTransId: `MT${Date.now()}`,
  amount,
  description: "Test payment",
  resultCode,
  message: resultCode === 1 ? "Payment successful" : "Payment failed",
  // merchantOrderId được nhúng vào extradata (đã encodeURIComponent theo spec)
  extradata: encodeURIComponent(JSON.stringify({ merchantOrderId: orderId })),
  paymentChannel: "ZALOPAY_SANDBOX",
};

const macString = [
  `appId=${data.appId}`,
  `amount=${data.amount}`,
  `description=${data.description}`,
  `orderId=${data.orderId}`,
  `message=${data.message}`,
  `resultCode=${data.resultCode}`,
  `transId=${data.transId}`,
].join("&");

const overallMacString = Object.keys(data)
  .sort()
  .map((k) => `${k}=${data[k]}`)
  .join("&");

const mac = createHmac("sha256", privateKey).update(macString).digest("hex");
const overallMac = createHmac("sha256", privateKey)
  .update(overallMacString)
  .digest("hex");

const body = { data, mac, overallMac };
console.log("→ POST", WEBHOOK_URL);
console.log("→ Body:", JSON.stringify(body, null, 2));

const res = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(`\n← Status: ${res.status}`);
console.log(`← Body: ${text}`);
