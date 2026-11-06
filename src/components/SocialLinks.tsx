import { MessageCircle } from "lucide-react";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { FacebookIcon } from "@/components/icons/FacebookIcon";

// Colores de marca reales de cada red — antes todos salían en gris uniforme
// (text-fg-muted), que es más "seguro" visualmente pero menos reconocible
// de un vistazo. Aquí cada ícono usa su color oficial sobre un fondo suave
// del mismo color (mismo patrón "chip" que ya se usa en Hero/Services).
const SOCIALS = [
  {
    Icon: MessageCircle,
    href: "https://wa.me/51900000000",
    label: "WhatsApp",
    color: "#25D366",
    bg: "rgba(37, 211, 102, 0.12)",
  },
  {
    Icon: FacebookIcon,
    href: "https://www.facebook.com/share/1CAYDHW7va/",
    label: "Facebook",
    color: "#1877F2",
    bg: "rgba(24, 119, 242, 0.12)",
  },
  {
    Icon: TikTokIcon,
    href: "https://www.tiktok.com/@infosistel6",
    label: "TikTok",
    color: "#000000",
    bg: "rgba(0, 0, 0, 0.08)",
  },
] as const;

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {SOCIALS.map(({ Icon, href, label, color, bg }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          style={{ backgroundColor: bg, color }}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5"
        >
          <Icon size={16} strokeWidth={1.75} />
        </a>
      ))}
    </div>
  );
}
