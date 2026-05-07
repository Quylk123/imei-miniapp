// ============================================
// Supabase Data Layer for Mini App
// ============================================

import { supabase } from "@/lib/supabase";
import type {
  Banner,
  Category,
  Customer,
  IMEI,
  Order,
  OrderItem,
  Package,
  PackageHistoryEntry,
  Product,
  ShippingAddress,
} from "@/types";

// ── Banners ─────────────────────────────────────────────────────────────────
export async function fetchBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("id, image_url, title, subtitle, link_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((b: any) => ({
    id: b.id,
    image_url: b.image_url,
    title: b.title ?? null,
    subtitle: b.subtitle ?? null,
    link_url: b.link_url ?? null,
  }));
}

// ── Categories ──────────────────────────────────────────────────────────────
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon ?? "package",
    color: c.color ?? "#666",
    image_url: c.image_url ?? undefined,
  }));
}

// ── Products ────────────────────────────────────────────────────────────────
const resolveCover = (p: { image_url?: string | null; image_urls?: string[] | null }): string => {
  if (p.image_urls && p.image_urls.length > 0) return p.image_urls[0];
  return p.image_url ?? "";
};

const resolveGallery = (p: { image_url?: string | null; image_urls?: string[] | null }): string[] | undefined => {
  if (p.image_urls && p.image_urls.length > 0) return p.image_urls;
  return p.image_url ? [p.image_url] : undefined;
};

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(slug)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    category: p.category_id ?? "",
    description: p.description ?? "",
    image_url: resolveCover(p),
    gallery: resolveGallery(p),
    price: Number(p.price),
    rating: p.rating ? Number(p.rating) : undefined,
    reviews_count: p.reviews_count ?? undefined,
    is_featured: p.is_featured ?? false,
    stock_quantity: Number(p.stock_quantity ?? 0),
  }));
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data: p, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;

  let gallery = resolveGallery(p as any);

  // Fallback: if no image_urls on row, try the legacy product_images table
  if (!gallery) {
    const { data: images } = await supabase
      .from("product_images")
      .select("url")
      .eq("product_id", id)
      .order("sort_order", { ascending: true });
    const fromTable = (images ?? []).map((i) => i.url);
    if (fromTable.length > 0) gallery = fromTable;
  }

  return {
    id: p.id,
    name: p.name,
    category: p.category_id ?? "",
    description: p.description ?? "",
    image_url: resolveCover(p as any),
    gallery,
    price: Number(p.price),
    rating: p.rating ? Number(p.rating) : undefined,
    reviews_count: p.reviews_count ?? undefined,
    is_featured: (p as any).is_featured ?? false,
    stock_quantity: Number((p as any).stock_quantity ?? 0),
  };
}

// ── Packages ────────────────────────────────────────────────────────────────
export async function fetchPackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    type: p.type as Package["type"],
    duration_days: p.duration_days,
    fixed_expiry_date: p.fixed_expiry_date ?? null,
    price: Number(p.price),
    description: p.description ?? "",
  }));
}

export async function fetchPackageById(id: string): Promise<Package | null> {
  const { data: p, error } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    type: p.type as Package["type"],
    duration_days: p.duration_days,
    fixed_expiry_date: (p as any).fixed_expiry_date ?? null,
    price: Number(p.price),
    description: p.description ?? "",
  };
}

// ── Customer ────────────────────────────────────────────────────────────────
export async function fetchCustomerByZaloId(zaloId: string): Promise<Customer | null> {
  const { data: c, error } = await supabase
    .from("customers")
    .select("*")
    .eq("zalo_id", zaloId)
    .maybeSingle();
  if (error) throw error;
  if (!c) return null;

  // Get IMEI IDs linked to this customer
  const { data: imeis } = await supabase
    .from("imeis")
    .select("id")
    .eq("customer_id", c.id);

  return {
    id: c.id,
    phone: c.phone ?? "",
    name: c.name,
    zalo_name: c.zalo_name ?? undefined,
    avatar_url: c.avatar_url ?? undefined,
    imei_ids: (imeis ?? []).map((i) => i.id),
  };
}

// ── IMEIs (for a customer) ──────────────────────────────────────────────────
export async function fetchMyIMEIs(customerId: string): Promise<IMEI[]> {
  // 1. Fetch IMEIs belonging to customer (with joined product)
  const { data: imeis, error } = await supabase
    .from("imeis")
    .select("*, products(id, name, image_url, image_urls)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!imeis?.length) return [];

  const imeiIds = imeis.map((i) => i.id);

  // 2. Fetch package relationships
  const { data: rels } = await supabase
    .from("imei_packages")
    .select("imei_id, package_id")
    .in("imei_id", imeiIds);

  const pkgMap = new Map<string, string[]>();
  for (const r of rels ?? []) {
    const arr = pkgMap.get(r.imei_id) ?? [];
    arr.push(r.package_id);
    pkgMap.set(r.imei_id, arr);
  }

  // 3. Fetch package activation history
  const { data: activations } = await supabase
    .from("package_activations")
    .select("*")
    .in("imei_id", imeiIds)
    .order("started_at", { ascending: true });

  const historyMap = new Map<string, PackageHistoryEntry[]>();
  for (const a of activations ?? []) {
    const arr = historyMap.get(a.imei_id) ?? [];
    arr.push({
      package_id: a.package_id,
      started_at: a.started_at,
      ended_at: a.ended_at ?? undefined,
    });
    historyMap.set(a.imei_id, arr);
  }

  // 4. Map to app IMEI type
  return imeis.map((i) => {
    const prod = (i as any).products as
      | { id: string; name: string; image_url: string | null; image_urls: string[] | null }
      | null
      | undefined;
    const productImage = prod
      ? (prod.image_urls && prod.image_urls.length > 0 ? prod.image_urls[0] : prod.image_url)
      : null;
    return {
      id: i.id,
      imei_number: i.imei_number,
      customer_id: i.customer_id ?? undefined,
      status: i.status as IMEI["status"],
      package_ids: pkgMap.get(i.id) ?? [],
      active_package_id: i.active_package_id ?? undefined,
      activation_date: i.activation_date ?? undefined,
      expiry_date: i.expiry_date ?? undefined,
      linked_at: i.linked_at ?? undefined,
      created_at: i.created_at ?? new Date().toISOString(),
      package_history: historyMap.get(i.id),
      product_id: prod?.id ?? undefined,
      product_name: prod?.name ?? undefined,
      product_image: productImage ?? undefined,
    };
  });
}

// ── Orders (for a customer) ─────────────────────────────────────────────────
export async function fetchMyOrders(customerId: string): Promise<Order[]> {
  // 1. Fetch orders
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!orders?.length) return [];

  const orderIds = orders.map((o) => o.id);

  // 2. Fetch order items
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  const itemsMap = new Map<number, OrderItem[]>();
  for (const it of items ?? []) {
    const arr = itemsMap.get(it.order_id) ?? [];
    arr.push({
      id: it.id,
      product_id: it.product_id ?? undefined,
      imei_id: it.imei_id ?? undefined,
      package_id: it.package_id ?? undefined,
      name: it.name,
      thumbnail: it.thumbnail ?? undefined,
      unit_price: Number(it.unit_price),
      quantity: it.quantity,
      subtotal: Number(it.subtotal),
    });
    itemsMap.set(it.order_id, arr);
  }

  // 3. Map to app Order type
  return orders.map((o) => {
    const shipping = o.shipping_address as ShippingAddress | null;
    return {
      id: o.id,
      kind: o.kind as Order["kind"],
      customer_id: o.customer_id,
      items: itemsMap.get(o.id) ?? [],
      subtotal: Number(o.subtotal),
      shipping_fee: Number(o.shipping_fee),
      discount: Number(o.discount),
      total: Number(o.total),
      payment_method: o.payment_method as Order["payment_method"],
      payment_status: o.payment_status as Order["payment_status"],
      status: o.status as Order["status"],
      shipping: shipping ?? undefined,
      created_at: o.created_at ?? new Date().toISOString(),
      paid_at: o.paid_at ?? null,
      updated_at: o.updated_at ?? null,
    };
  });
}

// ── Eligible packages for a specific IMEI ───────────────────────────────────
export async function fetchEligiblePackages(imeiId: string): Promise<Package[]> {
  const { data: rels, error } = await supabase
    .from("imei_packages")
    .select("package_id, packages(*)")
    .eq("imei_id", imeiId);
  if (error) throw error;

  return (rels ?? [])
    .map((r: any) => r.packages)
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type as Package["type"],
      duration_days: p.duration_days,
      price: Number(p.price),
      description: p.description ?? "",
    }));
}

// ── Fetch single IMEI by number (for QR activation) ────────────────────────
export async function fetchIMEIByNumber(imeiNumber: string): Promise<IMEI | null> {
  const { data: i, error } = await supabase
    .from("imeis")
    .select("*")
    .eq("imei_number", imeiNumber)
    .maybeSingle();
  if (error) throw error;
  if (!i) return null;

  return {
    id: i.id,
    imei_number: i.imei_number,
    customer_id: i.customer_id ?? undefined,
    status: i.status as IMEI["status"],
    package_ids: [],
    active_package_id: i.active_package_id ?? undefined,
    activation_date: i.activation_date ?? undefined,
    expiry_date: i.expiry_date ?? undefined,
    linked_at: i.linked_at ?? undefined,
    created_at: i.created_at ?? new Date().toISOString(),
  };
}

// ── Link IMEI (call Edge Function) ──────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function linkIMEI(
  imeiNumber: string,
  customerId: string,
  productId: string,
): Promise<{ imei: any; eligible_packages: Package[] }> {
  // Get current session for auth header
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/link-imei`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({
      imei_number: imeiNumber,
      customer_id: customerId,
      product_id: productId,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errBody.error ?? `Link failed: ${res.status}`);
  }

  return res.json();
}

// ── Lookup IMEI (call Edge Function) ────────────────────────────────────────
// Dùng EF (service-role) để xem được IMEI thuộc tài khoản khác — RLS chặn
// đọc trực tiếp khi customer_id khác caller.
export type ImeiLookupResult =
  | { exists: false }
  | {
      exists: true;
      status: string;
      ownership: "mine" | "unowned" | "other" | "unavailable";
      imei_id?: string;
      can_transfer?: boolean;
      reason?: string;
    };

export async function lookupIMEI(imeiNumber: string): Promise<ImeiLookupResult> {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/imei-lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ imei_number: imeiNumber }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errBody.error ?? `Lookup failed: ${res.status}`);
  }

  return res.json();
}

// ── Transfer IMEI ownership to caller (call Edge Function) ──────────────────
// Caller's customer_id được EF lấy từ JWT — không tin client.
export async function transferIMEI(
  imeiNumber: string,
): Promise<{ imei_id: string; status: string }> {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/transfer-imei`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ imei_number: imeiNumber }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errBody.error ?? `Transfer failed: ${res.status}`);
  }

  return res.json();
}

// ── Linkable products (filter by can_link_imei + is_active) ──────────────────
export interface LinkableProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[];
}

export async function fetchLinkableProducts(): Promise<LinkableProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, image_url, image_urls")
    .eq("can_link_imei", true)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

// ── Affiliate ────────────────────────────────────────────────────────────────

import type {
  AffiliateCommission,
  AffiliateStats,
  Referral,
} from "@/types";

/**
 * Fetch all affiliate data for a customer:
 * - Stats (total approved/pending commissions, referee count)
 * - Referrer info (who referred me)
 * - List of referees I invited
 *
 * Uses get_customer_public_info RPC to bypass RLS while only exposing
 * id, name, avatar_url (no phone/zalo_id).
 */
export async function fetchAffiliateData(
  customerId: string,
): Promise<{ stats: AffiliateStats; referees: Referral[] }> {
  // 1. My referees (people I referred)
  const { data: referralRows } = await supabase
    .from("referrals")
    .select("id, referrer_id, referee_id, created_at")
    .eq("referrer_id", customerId)
    .order("created_at", { ascending: false });

  const referees: Referral[] = [];
  if (referralRows && referralRows.length > 0) {
    const refereeIds = referralRows.map((r) => r.referee_id);

    // Use RPC to get public info (bypasses RLS safely)
    const { data: customers } = await supabase
      .rpc("get_customer_public_info", { p_customer_ids: refereeIds });
    type PubInfo = { id: string; name: string; avatar_url: string | null };
    const custMap = new Map<string, PubInfo>(
      ((customers ?? []) as PubInfo[]).map((c) => [c.id, c]),
    );

    // Check if referees have any delivered orders (via RPC to bypass orders RLS)
    const { data: orderStatus } = await supabase
      .rpc("check_referees_ordered", { p_referee_ids: refereeIds });
    const orderedSet = new Set(
      (orderStatus ?? [])
        .filter((o: { has_ordered: boolean }) => o.has_ordered)
        .map((o: { customer_id: string }) => o.customer_id),
    );

    for (const r of referralRows) {
      const c = custMap.get(r.referee_id);
      referees.push({
        id: r.id,
        referrer_id: r.referrer_id,
        referee_id: r.referee_id,
        created_at: r.created_at,
        referee_name: c?.name,
        referee_avatar: c?.avatar_url ?? undefined,
        has_ordered: orderedSet.has(r.referee_id),
      });
    }
  }

  // 2. Who referred me?
  const { data: myReferral } = await supabase
    .from("referrals")
    .select("referrer_id")
    .eq("referee_id", customerId)
    .maybeSingle();

  let referrer: AffiliateStats["referrer"] = undefined;
  if (myReferral) {
    // Use RPC for referrer info too
    const { data: refCustomers } = await supabase
      .rpc("get_customer_public_info", { p_customer_ids: [myReferral.referrer_id] });
    type PubInfo = { id: string; name: string; avatar_url: string | null };
    const refCustomer = (refCustomers as PubInfo[] | null)?.[0];
    if (refCustomer) {
      referrer = {
        name: refCustomer.name,
        avatar_url: refCustomer.avatar_url ?? undefined,
      };
    }
  }

  // 3. Commission totals
  const referralIds = referees.map((r) => r.id);
  let total_approved = 0;
  let total_pending = 0;

  if (referralIds.length > 0) {
    const { data: commissions } = await supabase
      .from("affiliate_commissions")
      .select("total_commission, status")
      .in("referral_id", referralIds);

    for (const c of commissions ?? []) {
      const amount = Number(c.total_commission);
      if (c.status === "approved") total_approved += amount;
      if (c.status === "pending") total_pending += amount;
    }
  }

  // 4. Withdrawals (already withdrawn)
  const { data: withdrawals } = await supabase
    .from("affiliate_withdrawals")
    .select("amount")
    .eq("customer_id", customerId);
  const total_withdrawn = (withdrawals ?? []).reduce(
    (s, w) => s + Number(w.amount),
    0,
  );

  return {
    stats: {
      total_approved,
      total_pending,
      total_withdrawn,
      balance: total_approved - total_withdrawn,
      total_referees: referees.length,
      referrer,
    },
    referees,
  };
}

/**
 * Fetch commission history for a referrer.
 */
export async function fetchCommissions(
  customerId: string,
): Promise<AffiliateCommission[]> {
  // Get all my referral IDs first
  const { data: referralRows } = await supabase
    .from("referrals")
    .select("id, referee_id")
    .eq("referrer_id", customerId);

  if (!referralRows || referralRows.length === 0) return [];

  const referralIds = referralRows.map((r) => r.id);
  const refereeIds = referralRows.map((r) => r.referee_id);

  // Get referee names (via RPC to bypass RLS)
  const { data: customers } = await supabase
    .rpc("get_customer_public_info", { p_customer_ids: refereeIds });
  const referralToReferee = new Map<string, string>(
    referralRows.map((r) => [r.id, r.referee_id]),
  );
  type PubInfo2 = { id: string; name: string; avatar_url: string | null };
  const custNameMap = new Map<string, string>(
    ((customers ?? []) as PubInfo2[]).map((c) => [c.id, c.name]),
  );

  // Get commissions
  const { data: commissions } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .in("referral_id", referralIds)
    .order("created_at", { ascending: false });

  if (!commissions || commissions.length === 0) return [];

  // Get product names
  const productIds = [...new Set(commissions.map((c) => c.product_id).filter(Boolean))];
  const { data: products } = await supabase
    .from("products")
    .select("id, name, image_url")
    .in("id", productIds);
  const prodMap = new Map(
    (products ?? []).map((p) => [p.id, p]),
  );

  return commissions.map((c) => {
    const refereeId = referralToReferee.get(c.referral_id);
    const prod = c.product_id ? prodMap.get(c.product_id) : null;
    return {
      id: c.id,
      order_id: c.order_id,
      product_name: prod?.name ?? "Sản phẩm",
      product_thumbnail: prod?.image_url ?? undefined,
      referee_name: refereeId ? (custNameMap.get(refereeId) ?? "Khách hàng") : "Khách hàng",
      commission_rate: Number(c.commission_rate),
      item_subtotal: Number(c.item_subtotal),
      total_commission: Number(c.total_commission),
      status: c.status as AffiliateCommission["status"],
      created_at: c.created_at,
      approved_at: c.approved_at ?? undefined,
    };
  });
}


