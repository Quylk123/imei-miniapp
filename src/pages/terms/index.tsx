import Page from "@/components/ui/page";

interface Section {
  heading: string;
  body: string[];
}

const LAST_UPDATED = "01/05/2026";

const SECTIONS: Section[] = [
  {
    heading: "1. Phạm vi áp dụng",
    body: [
      "Điều khoản này áp dụng cho tất cả người dùng ứng dụng quản lý SIM 5G. Bằng việc liên kết SIM hoặc thực hiện thanh toán, bạn xác nhận đã đọc và đồng ý với các điều khoản dưới đây.",
    ],
  },
  {
    heading: "2. Tài khoản",
    body: [
      "Bạn cần đăng nhập bằng tài khoản Zalo để sử dụng đầy đủ tính năng. Một số điện thoại Zalo chỉ tương ứng với một tài khoản trong hệ thống.",
      "Bạn chịu trách nhiệm bảo mật tài khoản Zalo của mình. Mọi hành động phát sinh từ tài khoản đã đăng nhập được xem là do bạn thực hiện.",
    ],
  },
  {
    heading: "3. Sử dụng SIM và gói cước",
    body: [
      "SIM được cung cấp chỉ dành cho các thiết bị IoT được phê duyệt (camera, định vị, loa tính tiền, báo cháy, v.v.). Cấm sử dụng SIM cho các mục đích thoại/SMS thông thường hoặc các hoạt động vi phạm pháp luật.",
      "Mỗi gói cước có thời hạn cố định. SIM sẽ chuyển sang trạng thái \"hết hạn\" khi hết thời hạn và có thể bị thu hồi nếu không gia hạn trong 60 ngày kể từ ngày hết hạn.",
    ],
  },
  {
    heading: "4. Thanh toán và hoàn tiền",
    body: [
      "Thanh toán được xử lý qua Zalo Pay (Checkout SDK). Khi giao dịch thành công, gói cước được kích hoạt ngay lập tức.",
      "Phí gói cước đã thanh toán không được hoàn lại, trừ trường hợp dịch vụ bị lỗi từ phía nhà cung cấp và có xác nhận từ đội hỗ trợ.",
    ],
  },
  {
    heading: "5. Trách nhiệm và giới hạn",
    body: [
      "Chúng tôi cố gắng duy trì dịch vụ ổn định nhưng không đảm bảo dịch vụ không có gián đoạn, lỗi hoặc gián đoạn từ phía nhà mạng.",
      "Chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh do mất kết nối SIM, miễn là chúng tôi đã thực hiện các biện pháp khắc phục hợp lý trong thời gian thông báo.",
    ],
  },
  {
    heading: "6. Thay đổi điều khoản",
    body: [
      "Chúng tôi có thể cập nhật điều khoản này theo thời gian. Phiên bản mới có hiệu lực ngay khi được đăng tải trên ứng dụng. Việc tiếp tục sử dụng ứng dụng sau khi cập nhật được xem là bạn đồng ý với các thay đổi.",
    ],
  },
  {
    heading: "7. Liên hệ",
    body: [
      "Mọi thắc mắc về điều khoản sử dụng, vui lòng liên hệ qua kênh hỗ trợ trong ứng dụng.",
    ],
  },
];

export default function TermsPage() {
  return (
    <Page>
      <div className="space-y-lg pb-lg">
        <header>
          <h1 className="text-[22px] leading-[1.18] font-semibold text-ink tracking-[-0.18px]">
            Điều khoản sử dụng
          </h1>
          <p className="mt-xxs text-[13px] leading-[1.23] text-muted">
            Cập nhật lần cuối: {LAST_UPDATED}
          </p>
        </header>

        <div className="rounded-md border border-hairline p-base">
          <p className="text-[14px] leading-[1.5] text-body">
            Vui lòng đọc kỹ trước khi sử dụng dịch vụ SIM 5G. Bằng việc tiếp tục
            dùng ứng dụng, bạn đồng ý ràng buộc bởi các điều khoản sau.
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
