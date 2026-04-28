// ============================================
// Zalo Mini App Authentication Service — v2
// ============================================
// Flow:
// 1. Request Zalo permissions (userInfo + phoneNumber)
// 2. Gather user profile + phone token + access token
// 3. Decode phone ON CLIENT (VN IP) via Zalo Graph API
// 4. Send decoded phone + access_token to Edge Function
// 5. Edge Function verifies identity + creates Supabase Auth user

import { authorize, getAccessToken, getPhoneNumber, getUserInfo } from "zmp-sdk";

import { supabase } from "@/lib/supabase";
import type { AuthResponse, Customer } from "@/types";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zalo-auth`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const ZALO_APP_SECRET = import.meta.env.VITE_ZALO_APP_SECRET as string;

// ── Storage keys ────────────────────────────────────────────────────────────
const CUSTOMER_STORAGE_KEY = "imei_customer";

export function getCachedCustomer(): Customer | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedCustomer(customer: Customer): void {
  try {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
  } catch {
    // Ignore
  }
}

export function clearAuthCache(): void {
  try {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

// ── Step 1: Request Zalo Permissions ────────────────────────────────────────
export async function requestZaloPermissions(): Promise<void> {
  await authorize({
    scopes: ["scope.userInfo", "scope.userPhonenumber"],
  });
}

// ── Step 2: Get Zalo User Profile ───────────────────────────────────────────
export async function getZaloUserProfile(): Promise<{
  id: string;
  name: string;
  avatar: string;
}> {
  const { userInfo } = await getUserInfo({ autoRequestPermission: false });
  return {
    id: userInfo.id,
    name: userInfo.name ?? "Zalo User",
    avatar: userInfo.avatar ?? "",
  };
}

// ── Step 3: Get Phone Token ─────────────────────────────────────────────────
export async function getZaloPhoneToken(): Promise<string | null> {
  try {
    const result = await getPhoneNumber();
    return result?.token ?? null;
  } catch (err) {
    console.warn("[zalo-auth] getPhoneNumber failed:", err);
    return null;
  }
}

// ── Step 4: Get Access Token ────────────────────────────────────────────────
export async function getZaloAccessToken(): Promise<string | null> {
  try {
    const result = await getAccessToken();
    return result ?? null;
  } catch (err) {
    console.warn("[zalo-auth] getAccessToken failed:", err);
    return null;
  }
}

// ── Step 5: Decode phone ON CLIENT (VN IP) ──────────────────────────────────
// Zalo Graph API requires Vietnamese IP — Mini App runs on user's phone = VN IP
export async function decodePhoneOnClient(
  accessToken: string,
  phoneToken: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://graph.zalo.me/v2.0/me/info", {
      method: "GET",
      headers: {
        access_token: accessToken,
        code: phoneToken,
        secret_key: ZALO_APP_SECRET,
      },
    });
    const json = await res.json();
    console.log("[zalo-auth] Client phone decode result:", json.error === 0 ? "OK" : json.message);

    if (json.error !== 0) return null;

    // Response: { data: { number: "849123456789" }, error: 0, message: "Success" }
    const rawPhone = json?.data?.number;
    if (!rawPhone) return null;

    // Normalize: 84xxx → 0xxx
    if (rawPhone.startsWith("84")) {
      return "0" + rawPhone.slice(2);
    }
    return rawPhone;
  } catch (err) {
    console.error("[zalo-auth] Client phone decode error:", err);
    return null;
  }
}

// ── Step 6: Call Edge Function ──────────────────────────────────────────────
export async function callZaloAuthEndpoint(payload: {
  zalo_id: string;
  name: string;
  avatar_url: string;
  phone: string | null;
  access_token: string | null;
}): Promise<AuthResponse> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Auth endpoint error ${res.status}: ${errBody}`);
  }

  const data = await res.json();

  // Map response
  const customer: Customer = {
    id: data.customer.id,
    phone: data.customer.phone ?? "",
    name: data.customer.name,
    zalo_name: data.customer.zalo_name,
    avatar_url: data.customer.avatar_url,
    imei_ids: [], // Will be loaded separately
  };

  return {
    customer,
    session: data.session,
    is_new_customer: data.is_new_customer,
  };
}

// ── Full Registration Flow ──────────────────────────────────────────────────
export async function fullRegistrationFlow(): Promise<AuthResponse> {
  // 1. Request permissions
  await requestZaloPermissions();

  // 2. Gather data in parallel
  const [profile, phoneToken, accessToken] = await Promise.all([
    getZaloUserProfile(),
    getZaloPhoneToken(),
    getZaloAccessToken(),
  ]);

  // 3. Decode phone on client (VN IP)
  let phone: string | null = null;
  if (phoneToken && accessToken) {
    phone = await decodePhoneOnClient(accessToken, phoneToken);
    console.log("[zalo-auth] Phone decoded on client:", phone ? "OK" : "FAILED");
  }

  // 4. Call Edge Function with decoded phone + access_token for identity verification
  const result = await callZaloAuthEndpoint({
    zalo_id: profile.id,
    name: profile.name,
    avatar_url: profile.avatar,
    phone,
    access_token: accessToken,
  });

  // 5. Set Supabase session (RLS-ready)
  if (result.session) {
    await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
  }

  // 6. Cache customer data
  setCachedCustomer(result.customer);

  return result;
}
