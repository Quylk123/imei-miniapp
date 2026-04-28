// ============================================
// Supabase Data Layer for Mini App
// ============================================

import { supabase } from "@/lib/supabase";
import type {
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
  }));
}

// ── Products ────────────────────────────────────────────────────────────────
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
    image_url: p.image_url ?? "",
    specs: (p.specs ?? {}) as Record<string, string>,
    price: Number(p.price),
    rating: p.rating ? Number(p.rating) : undefined,
    reviews_count: p.reviews_count ?? undefined,
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

  // Fetch gallery images
  const { data: images } = await supabase
    .from("product_images")
    .select("url")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });

  const gallery = (images ?? []).map((i) => i.url);

  return {
    id: p.id,
    name: p.name,
    category: p.category_id ?? "",
    description: p.description ?? "",
    image_url: p.image_url ?? "",
    gallery: gallery.length > 0 ? gallery : undefined,
    specs: (p.specs ?? {}) as Record<string, string>,
    price: Number(p.price),
    rating: p.rating ? Number(p.rating) : undefined,
    reviews_count: p.reviews_count ?? undefined,
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
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type as Package["type"],
    duration_days: p.duration_days,
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
  // 1. Fetch IMEIs belonging to customer
  const { data: imeis, error } = await supabase
    .from("imeis")
    .select("*")
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
  return imeis.map((i) => ({
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
  }));
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

  const itemsMap = new Map<string, OrderItem[]>();
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
    body: JSON.stringify({ imei_number: imeiNumber, customer_id: customerId }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errBody.error ?? `Link failed: ${res.status}`);
  }

  return res.json();
}

// ── Create IMEI Order (call Edge Function) ──────────────────────────────────
export async function createIMEIOrder(params: {
  imei_id: string;
  package_id: string;
  customer_id: string;
  payment_method?: string;
}): Promise<{ order: any; imei: any; auto_activated: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-imei-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errBody.error ?? `Create order failed: ${res.status}`);
  }

  return res.json();
}

