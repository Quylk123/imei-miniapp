import type { Category, Customer, IMEI, Order, Package, Product } from "@/types";

export const categories: Category[] = [
  { id: "c1", name: "Đồng hồ định vị", slug: "gps-watch", icon: "watch", color: "#ff385c" },
  { id: "c2", name: "Camera hành trình", slug: "dashcam", icon: "camera", color: "#460479" },
  { id: "c3", name: "Thiết bị chống trộm", slug: "anti-theft", icon: "shield", color: "#0d7a4a" },
  { id: "c4", name: "Phụ kiện", slug: "accessories", icon: "package", color: "#92174d" },
];

export const products: Product[] = [
  {
    id: "p1",
    name: "Đồng hồ định vị trẻ em GPS-K10",
    category: "c1",
    description:
      "Đồng hồ định vị thời gian thực, gọi 2 chiều, chống nước IP67, pin 3 ngày. Tích hợp gói cước data 4G riêng.",
    image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200",
      "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=1200",
    ],
    specs: { "Màn hình": '1.4" IPS', Pin: "680mAh", "Chống nước": "IP67", SIM: "Nano 4G" },
    default_package_id: "pk1",
    price: 1290000,
    rating: 4.82,
    reviews_count: 234,
  },
  {
    id: "p2",
    name: "Camera hành trình Pro X3",
    category: "c2",
    description:
      "Camera hành trình 2K, ghi hình 24/7, định vị GPS, cảnh báo va chạm. Đi kèm gói cước cloud lưu trữ 30 ngày.",
    image_url: "https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=800",
    specs: { "Độ phân giải": "2K 30fps", "Góc rộng": "170°", "Bộ nhớ": "Hỗ trợ 256GB" },
    default_package_id: "pk2",
    price: 2490000,
    rating: 4.9,
    reviews_count: 511,
  },
  {
    id: "p3",
    name: "Thiết bị chống trộm xe máy GT-02",
    category: "c3",
    description: "Định vị GPS thời gian thực, ngắt máy từ xa qua app, pin dự phòng 5 ngày.",
    image_url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800",
    specs: { "Pin dự phòng": "5 ngày", SIM: "Nano 4G", Sensor: "Rung + nghiêng" },
    default_package_id: "pk1",
    price: 890000,
    rating: 4.65,
    reviews_count: 122,
  },
  {
    id: "p4",
    name: "Đồng hồ định vị người già SOS-S5",
    category: "c1",
    description: "Nút SOS, đo nhịp tim, gọi 2 chiều, định vị 3 lớp.",
    image_url: "https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=800",
    specs: { "Màn hình": '1.3" TFT', Pin: "550mAh", SOS: "Có" },
    default_package_id: "pk1",
    price: 1490000,
    rating: 4.72,
    reviews_count: 89,
  },
  {
    id: "p5",
    name: "Camera lùi không dây HD",
    category: "c4",
    description: "Camera lùi không dây 1080p, kết nối camera hành trình qua wifi.",
    image_url: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800",
    specs: { "Độ phân giải": "1080p", "Góc nhìn": "150°" },
    price: 590000,
    rating: 4.5,
    reviews_count: 56,
  },
  {
    id: "p6",
    name: "Sạc dự phòng GPS-Power",
    category: "c4",
    description: "Sạc dự phòng 10000mAh chuyên cho thiết bị định vị, output 5V/2A.",
    image_url: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800",
    specs: { "Dung lượng": "10000mAh", "Cổng sạc": "Type-C, USB-A" },
    price: 390000,
    rating: 4.6,
    reviews_count: 73,
  },
];

export const packages: Package[] = [
  {
    id: "pk0",
    name: "Dùng thử 30 ngày",
    type: "trial",
    duration_days: 30,
    price: 0,
    description: "Miễn phí 30 ngày đầu cho thiết bị mới.",
  },
  {
    id: "pk1",
    name: "Gói 6 tháng",
    type: "renewal",
    duration_days: 180,
    price: 360000,
    description: "Tiết kiệm 10% so với gói 1 tháng.",
  },
  {
    id: "pk2",
    name: "Gói 12 tháng",
    type: "renewal",
    duration_days: 365,
    price: 600000,
    description: "Phổ biến nhất — tiết kiệm 25%.",
  },
  {
    id: "pk3",
    name: "Gói 24 tháng",
    type: "renewal",
    duration_days: 730,
    price: 1080000,
    description: "Tiết kiệm 35% — gói dài hạn.",
  },
  {
    id: "pk4",
    name: "Trọn đời",
    type: "lifetime",
    duration_days: 0,
    price: 2990000,
    description: "Một lần thanh toán, dùng mãi mãi.",
  },
];

const today = new Date();
const addDays = (d: number) => new Date(today.getTime() + d * 86400000).toISOString();

export const myImeis: IMEI[] = [
  {
    id: "im1",
    imei_number: "356789102345671",
    product_id: "p1",
    customer_id: "cu1",
    status: "activated",
    package_ids: ["pk1", "pk2", "pk3", "pk4"],
    active_package_id: "pk2",
    activation_date: addDays(-120),
    expiry_date: addDays(245),
    created_at: addDays(-120),
  },
  {
    id: "im2",
    imei_number: "356789102345672",
    product_id: "p2",
    customer_id: "cu1",
    status: "locked",
    package_ids: ["pk1", "pk2", "pk3", "pk4"],
    active_package_id: undefined,
    activation_date: addDays(-400),
    expiry_date: addDays(-12),
    created_at: addDays(-400),
  },
  {
    id: "im3",
    imei_number: "356789102345673",
    product_id: "p3",
    customer_id: "cu1",
    status: "pending_activation",
    package_ids: ["pk0", "pk1", "pk2", "pk3"],
    activation_date: undefined,
    expiry_date: undefined,
    created_at: addDays(-3),
  },
];

export const mockCustomer: Customer = {
  id: "cu1",
  phone: "0901234567",
  name: "Dương Châu",
  zalo_name: "Dương Châu",
  imei_ids: ["im1", "im2", "im3"],
};

export const myOrders: Order[] = [
  {
    id: "o1001",
    kind: "imei",
    customer_id: "cu1",
    items: [
      {
        id: "oi1",
        imei_id: "im1",
        package_id: "pk2",
        name: "Gói 12 tháng — IMEI ...5671",
        unit_price: 600000,
        quantity: 1,
        subtotal: 600000,
      },
    ],
    subtotal: 600000,
    shipping_fee: 0,
    discount: 0,
    total: 600000,
    payment_method: "zalopay",
    payment_status: "paid",
    status: "activated",
    created_at: addDays(-120),
  },
  {
    id: "o1002",
    kind: "physical",
    customer_id: "cu1",
    items: [
      {
        id: "oi2",
        product_id: "p3",
        name: "Thiết bị chống trộm xe máy GT-02",
        thumbnail: products[2].image_url,
        unit_price: 890000,
        quantity: 1,
        subtotal: 890000,
      },
    ],
    subtotal: 890000,
    shipping_fee: 30000,
    discount: 0,
    total: 920000,
    payment_method: "cod",
    payment_status: "paid",
    status: "delivered",
    shipping: {
      recipient_name: "Dương Châu",
      recipient_phone: "0901234567",
      street: "12 Lê Lợi",
      ward: "Phường Bến Nghé",
      district: "Quận 1",
      province: "TP. HCM",
    },
    created_at: addDays(-30),
  },
];

export const banners = [
  {
    id: "b1",
    title: "An tâm cho người thân",
    subtitle: "Thiết bị định vị thế hệ mới — bảo hành 24 tháng",
    image: "https://images.unsplash.com/photo-1610552050890-fe99536c2615?w=1600",
  },
  {
    id: "b2",
    title: "Ưu đãi gói 12 tháng",
    subtitle: "Tiết kiệm 25% — chỉ từ 600.000đ",
    image: "https://images.unsplash.com/photo-1611174243606-92e9b8d52a4f?w=1600",
  },
];
