import Image from "next/image";

export function YapeIcon({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/yape.png"
      alt="Yape"
      width={size}
      height={size}
      className={`rounded-lg object-contain shrink-0 ${className}`}
      priority
    />
  );
}

export function YapeBadge({
  titular,
  number,
}: {
  titular?: string;
  number?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#742284]/30 bg-[#742284]/10 dark:bg-[#742284]/25 px-2.5 py-0.5 text-xs font-bold text-[#742284] dark:text-[#c084fc]">
      <YapeIcon size={16} />
      <span>{titular || "Yape"}</span>
      {number && <span className="opacity-75 font-mono text-[11px]">{number}</span>}
    </span>
  );
}
