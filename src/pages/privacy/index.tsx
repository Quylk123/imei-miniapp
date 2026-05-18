import Page from "@/components/ui/page";

interface Section {
  heading: string;
  body: string[];
}

const LAST_UPDATED = "01/05/2026";

const SECTIONS: Section[] = [
  {
    heading: "1. Thông tin chúng tôi thu thập",
    body: [
      "Khi bạn đăng ký và sử dụng ứng dụng, chúng tôi thu thập các thông tin cơ bản từ tài khoản Zalo của bạn (tên hiển thị, ảnh đại diện, số điện thoại) và dữ liệu liên kết SIM (mã IMEI, thiết bị, lịch sử gói cước, lịch sử thanh toán).",
      "Chúng tôi không thu thập danh bạ, vị trí GPS, hoặc nội dung tin nhắn cá nhân.",
    ],
  },
  {
    heading: "2. Mục đích sử dụng",
    body: [
      "Thông tin được dùng để: xác thực người dùng, quản lý SIM của bạn, xử lý thanh toán gói cước, gửi thông báo trạng thái SIM (sắp hết hạn, cần kích hoạt), và hỗ trợ khi bạn liên hệ với chúng tôi.",
    ],
  },
  {
    heading: "3. Chia sẻ thông tin",
    body: [
      "Chúng tôi không bán hay chia sẻ thông tin của bạn với bên thứ ba phục vụ mục đích quảng cáo.",
      "Thông tin có thể được chia sẻ với đối tác thanh toán (Zalo Pay) và nhà mạng để xử lý dịch vụ SIM của bạn — chỉ ở mức tối thiểu cần thiết.",
    ],
  },
  {
    heading: "4. Bảo mật dữ liệu",
    body: [
      "Dữ liệu được lưu trữ trên hệ thống có mã hoá. Việc truy cập hệ thống nội bộ được kiểm soát chặt chẽ và ghi log.",
      "Bạn nên giữ kín thông tin tài khoản Zalo và không chia sẻ mã QR liên kết SIM cho người khác.",
    ],
  },
  {
    heading: "5. Quyền của bạn",
    body: [
      "Bạn có quyền yêu cầu xem, chỉnh sửa, hoặc xoá thông tin cá nhân khỏi hệ thống bằng cách liên hệ qua kênh hỗ trợ trong ứng dụng.",
    ],
  },
  {
    heading: "6. Liên hệ",
    body: [
      "Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ qua Zalo OA hoặc hotline được liệt kê trong mục Hỗ trợ.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <Page>
      <div className="space-y-lg pb-lg">
        <header>
          <h1 className="text-[22px] leading-[1.18] font-semibold text-ink tracking-[-0.18px]">
            Chính sách bảo mật
          </h1>
          <p className="mt-xxs text-[13px] leading-[1.23] text-muted">
            Cập nhật lần cuối: {LAST_UPDATED}
          </p>
        </header>

        <div className="rounded-md border border-hairline p-base">
          <p className="text-[14px] leading-[1.5] text-body">
            Chúng tôi tôn trọng quyền riêng tư của bạn. Tài liệu này mô tả cách
            chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân khi bạn sử
            dụng ứng dụng.
          </p>
        </div>

        <div className="space-y-md">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-[15px] leading-[1.33] font-semibold text-ink">
                {s.heading}
              </h2>
              <div className="mt-xs space-y-xs">
                {s.body.map((p, i) => (
                  <p
                    key={i}
                    className="text-[14px] leading-[1.5] text-body"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Page>
  );
}
