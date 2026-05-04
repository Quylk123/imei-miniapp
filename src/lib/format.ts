const vnd = new Intl.NumberFormat("vi-VN");

/** "1.290.000đ" — Airbnb-style price string. */
export const formatVND = (n: number) => `${vnd.format(n)}đ`;

export const formatRating = (n?: number) => (typeof n === "number" ? n.toFixed(2) : "—");

export const formatExpiry = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/** "14:32 · 04/05/2026" — ngày giờ đầy đủ. */
export const formatDateTime = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${time} · ${date}`;
};

/** Số ngày từ now → date (âm = đã qua). */
export const daysUntil = (iso?: string) => {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
};

/**
 * "Liên kết 3 ngày trước" style — relative time tiếng Việt.
 * Quá 30 ngày trả về absolute date để khỏi mơ hồ ("X tháng trước" rất rộng).
 */
export const formatRelative = (iso?: string) => {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return formatExpiry(iso);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hôm qua";
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return formatExpiry(iso);
};
