interface LogoLoaderProps {
  size?: number;
  label?: string;
  className?: string;
  fullPage?: boolean;
}

export default function LogoLoader({
  size = 80,
  label = 'Загрузка данных...',
  className = '',
  fullPage = false,
}: LogoLoaderProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 select-none pointer-events-none ${className}`}>
      <img
        src="/logo_loader_draw.svg"
        alt="Загрузка SmartSale..."
        style={{ width: size, height: size }}
        className="drop-shadow-sm"
      />
      {label && (
        <span className="text-xs font-semibold text-[#86868b] tracking-wide animate-pulse">
          {label}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
