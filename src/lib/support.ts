import { openChat } from "zmp-sdk/apis";

const SUPPORT_OA_ID = "3321539507154088075";
export const HOTLINE_NUMBER = "0888527999";
export const HOTLINE_HOURS = "8h–22h hàng ngày";

export async function openSupportChat() {
  try {
    await openChat({ type: "oa", id: SUPPORT_OA_ID });
  } catch (err) {
    console.warn("[support] openChat failed:", err);
  }
}

/** Mở dialer điện thoại để gọi hotline. */
export function dialHotline() {
  window.location.href = `tel:${HOTLINE_NUMBER.replace(/\s/g, "")}`;
}
