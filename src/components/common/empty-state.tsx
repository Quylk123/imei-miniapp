import { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-xxl px-base">
      {icon && <div className="mb-base text-muted-soft">{icon}</div>}
      <div className="text-[22px] leading-[1.18] font-medium tracking-[-0.44px] text-ink">
        {title}
      </div>
      {description && (
        <p className="text-[14px] leading-[1.43] text-muted mt-xs max-w-[280px]">
          {description}
        </p>
      )}
      {action && <div className="mt-lg">{action}</div>}
    </div>
  );
}
