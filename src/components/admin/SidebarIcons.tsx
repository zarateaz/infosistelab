import React from "react";

export interface SidebarIconProps {
  size?: number;
  className?: string;
  active?: boolean;
}

// 1. Dashboard: Command center with analytics widgets & glowing pulse
export function DashboardIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="dash-bg-1" x1="2" y1="2" x2="13" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="dash-bg-2" x1="15" y1="2" x2="26" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="dash-bg-3" x1="2" y1="15" x2="13" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="dash-bg-4" x1="15" y1="15" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Top Left: Main metric gauge */}
      <rect x="2.5" y="2.5" width="10" height="10" rx="3" fill="url(#dash-bg-1)" />
      <path d="M5 8.5C5 6.567 6.567 5 8.5 5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="#FFFFFF" />

      {/* Top Right: Sparkline widget */}
      <rect x="15.5" y="2.5" width="10" height="10" rx="3" fill="url(#dash-bg-2)" />
      <path d="M17.5 9.5L19.5 7.5L21.5 8.5L23.5 5.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

      {/* Bottom Left: Bar graph */}
      <rect x="2.5" y="15.5" width="10" height="10" rx="3" fill="url(#dash-bg-3)" />
      <rect x="4.5" y="21" width="1.8" height="2.5" rx="0.5" fill="#FFFFFF" />
      <rect x="7" y="19" width="1.8" height="4.5" rx="0.5" fill="#FFFFFF" />
      <rect x="9.5" y="17.5" width="1.8" height="6" rx="0.5" fill="#FFFFFF" />

      {/* Bottom Right: Status indicator */}
      <rect x="15.5" y="15.5" width="10" height="10" rx="3" fill="url(#dash-bg-4)" />
      <circle cx="20.5" cy="20.5" r="3" fill="#FFFFFF" fillOpacity="0.3" />
      <circle cx="20.5" cy="20.5" r="1.75" fill="#FFFFFF" />
    </svg>
  );
}

// 2. Calculadora Real: Realistic pocket / commercial calculator with LCD, solar panel, and tactile keys
export function RealCalculatorIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="calc-body" x1="14" y1="2" x2="14" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#334155" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="calc-lcd" x1="4.5" y1="5.5" x2="16.5" y2="10.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7" />
          <stop offset="1" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id="calc-solar" x1="18.5" y1="5.5" x2="23.5" y2="10.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#92400E" />
          <stop offset="1" stopColor="#78350F" />
        </linearGradient>
        <linearGradient id="calc-eq" x1="18" y1="20" x2="23.5" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Beveled Main Chassis */}
      <rect x="3" y="2.5" width="22" height="23" rx="4" fill="url(#calc-body)" stroke="#475569" strokeWidth="1" />

      {/* Glass Top Bevel Highlight */}
      <path d="M6 3.5H22C23.38 3.5 24 4.12 24 5.5" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />

      {/* Digital LCD Screen */}
      <rect x="5" y="5.5" width="12" height="5" rx="1.5" fill="url(#calc-lcd)" stroke="#0C4A6E" strokeWidth="0.5" />
      {/* Digits simulation on screen */}
      <text x="15" y="9.5" fill="#E0F2FE" fontSize="4" fontWeight="bold" textAnchor="end" fontFamily="monospace">
        12.80
      </text>

      {/* Solar Panel Cells */}
      <rect x="18.5" y="5.5" width="5" height="5" rx="1" fill="url(#calc-solar)" stroke="#451A03" strokeWidth="0.5" />
      <line x1="21" y1="5.5" x2="21" y2="10.5" stroke="#B45309" strokeWidth="0.5" />

      {/* Row 1 Keys */}
      <rect x="5" y="12" width="3.5" height="2.8" rx="0.8" fill="#EF4444" /> {/* C */}
      <rect x="9.5" y="12" width="3.5" height="2.8" rx="0.8" fill="#64748B" /> {/* ± */}
      <rect x="14" y="12" width="3.5" height="2.8" rx="0.8" fill="#64748B" /> {/* % */}
      <rect x="18.5" y="12" width="4.5" height="2.8" rx="0.8" fill="#38BDF8" /> {/* ÷ */}

      {/* Row 2 Keys */}
      <rect x="5" y="16" width="3.5" height="2.8" rx="0.8" fill="#CBD5E1" /> {/* 7 */}
      <rect x="9.5" y="16" width="3.5" height="2.8" rx="0.8" fill="#CBD5E1" /> {/* 8 */}
      <rect x="14" y="16" width="3.5" height="2.8" rx="0.8" fill="#CBD5E1" /> {/* 9 */}
      <rect x="18.5" y="16" width="4.5" height="2.8" rx="0.8" fill="#38BDF8" /> {/* × */}

      {/* Row 3 Keys */}
      <rect x="5" y="20" width="3.5" height="3.2" rx="0.8" fill="#CBD5E1" /> {/* 4 */}
      <rect x="9.5" y="20" width="3.5" height="3.2" rx="0.8" fill="#CBD5E1" /> {/* 5 */}
      <rect x="14" y="20" width="3.5" height="3.2" rx="0.8" fill="#CBD5E1" /> {/* 6 */}
      {/* Equals button (big colorful key) */}
      <rect x="18.5" y="20" width="4.5" height="3.2" rx="0.8" fill="url(#calc-eq)" />
      <path d="M20 21.2H22M20 22.2H22" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

// 3. Seguridad: Metallic security shield with lock
export function SecurityIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="sec-shield" x1="14" y1="2" x2="14" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="sec-rim" x1="4" y1="2" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6EE7B7" />
          <stop offset="1" stopColor="#065F46" />
        </linearGradient>
        <linearGradient id="sec-lock" x1="14" y1="11" x2="14" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCD34D" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Shield Base */}
      <path
        d="M14 2.5L23.5 6.5V13C23.5 19.2 19.4 24.2 14 26C8.6 24.2 4.5 19.2 4.5 13V6.5L14 2.5Z"
        fill="url(#sec-shield)"
        stroke="url(#sec-rim)"
        strokeWidth="1.5"
      />
      {/* Shield 3D Crest Light Line */}
      <path d="M14 3.5V25" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.3" />

      {/* Security Padlock Shackle */}
      <path
        d="M11 13V11C11 9.343 12.343 8 14 8C15.657 8 17 9.343 17 11V13"
        stroke="#FEF3C7"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Padlock Body */}
      <rect x="9.5" y="13" width="9" height="7" rx="2" fill="url(#sec-lock)" stroke="#92400E" strokeWidth="0.8" />
      {/* Keyhole */}
      <circle cx="14" cy="15.8" r="1.1" fill="#78350F" />
      <path d="M14 16.5V18.2" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 4. Cobranza de Internet: "EL ESCUDO CON WIFI" - Internet security shield with vivid Wi-Fi radiating broadcast
export function WifiShieldIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="wifi-shield-bg" x1="14" y1="2" x2="14" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" />
          <stop offset="0.6" stopColor="#0284C7" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="wifi-shield-rim" x1="4" y1="2" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DD3FC" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="wifi-waves-grad" x1="8" y1="8" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#BAE6FD" />
        </linearGradient>
        <filter id="wifi-glow" x="2" y="2" width="24" height="24" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#38BDF8" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Main Armor Shield */}
      <path
        d="M14 2.5L23.5 6.5V13C23.5 19.3 19.4 24.3 14 26C8.6 24.3 4.5 19.3 4.5 13V6.5L14 2.5Z"
        fill="url(#wifi-shield-bg)"
        stroke="url(#wifi-shield-rim)"
        strokeWidth="1.6"
      />

      {/* Left Shield Gloss Reflection */}
      <path
        d="M6 7.5L14 4V24.5C9.8 23 6 18.5 6 13V7.5Z"
        fill="#FFFFFF"
        opacity="0.12"
      />

      {/* Wi-Fi Wave 3 (Outer Arc) */}
      <path
        d="M8.2 10.5C11.5 7.5 16.5 7.5 19.8 10.5"
        stroke="url(#wifi-waves-grad)"
        strokeWidth="2.1"
        strokeLinecap="round"
        filter="url(#wifi-glow)"
      />

      {/* Wi-Fi Wave 2 (Middle Arc) */}
      <path
        d="M10.8 13.8C12.6 12 15.4 12 17.2 13.8"
        stroke="url(#wifi-waves-grad)"
        strokeWidth="2.1"
        strokeLinecap="round"
      />

      {/* Wi-Fi Wave 1 (Inner Arc) */}
      <path
        d="M12.6 17C13.4 16.2 14.6 16.2 15.4 17"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center Broadcast Pulse Dot */}
      <circle cx="14" cy="20.5" r="1.8" fill="#F0F9FF" />
      <circle cx="14" cy="20.5" r="3.2" stroke="#38BDF8" strokeWidth="0.8" opacity="0.8" />
    </svg>
  );
}

// 5. Caja: Realistic Cash Register / Money Wallet with golden coin & green banknotes
export function CashRegisterIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="caja-wallet" x1="14" y1="6" x2="14" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E40AF" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="caja-bill" x1="5" y1="3" x2="22" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4ADE80" />
          <stop offset="1" stopColor="#16A34A" />
        </linearGradient>
        <linearGradient id="caja-coin" x1="18" y1="12" x2="25" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Green Cash Bill popping out */}
      <rect x="5.5" y="3.5" width="17" height="6.5" rx="1.5" fill="url(#caja-bill)" stroke="#15803D" strokeWidth="0.8" />
      <circle cx="14" cy="6.7" r="1.5" fill="#DCFCE7" />

      {/* Main Leather Wallet Body */}
      <rect x="3" y="7" width="22" height="17" rx="3.5" fill="url(#caja-wallet)" stroke="#3B82F6" strokeWidth="1" />
      <path d="M3 11H25" stroke="#1D4ED8" strokeWidth="1" />

      {/* Wallet Flap with Stitching */}
      <path d="M16 11H25V19H16C13.8 19 13.8 11 16 11Z" fill="#1D4ED8" stroke="#60A5FA" strokeWidth="0.8" />

      {/* Golden Coin Clasp */}
      <circle cx="18" cy="15" r="2.8" fill="url(#caja-coin)" stroke="#B45309" strokeWidth="0.7" />
      <text x="18" y="16.5" fill="#78350F" fontSize="3" fontWeight="bold" textAnchor="middle">
        S/
      </text>
    </svg>
  );
}

// 6. Pedidos: Colorful shopping bag with handles and price tag
export function OrdersBagIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="bag-body" x1="14" y1="8" x2="14" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F43F5E" />
          <stop offset="1" stopColor="#BE123C" />
        </linearGradient>
      </defs>
      {/* Handles */}
      <path
        d="M10 10V6.5C10 4.567 11.567 3 13.5 3H14.5C16.433 3 18 4.567 18 6.5V10"
        stroke="#E11D48"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Bag Body */}
      <path
        d="M4.5 9.5H23.5L21.8 24.5C21.6 25.3 20.8 26 20 26H8C7.2 26 6.4 25.3 6.2 24.5L4.5 9.5Z"
        fill="url(#bag-body)"
        stroke="#FDA4AF"
        strokeWidth="0.8"
      />
      {/* Front Fold / Ribbon Accent */}
      <path d="M4.8 11.5L14 16L23.2 11.5" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
      {/* Tag */}
      <circle cx="14" cy="19" r="2.5" fill="#FFFFFF" />
      <path d="M12.8 19L13.8 20L15.2 18" stroke="#E11D48" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 7. Ventas: Dynamic trending up line chart with vivid emerald glow
export function SalesTrendIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="sales-area" x1="14" y1="6" x2="14" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" stopOpacity="0.45" />
          <stop offset="1" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sales-line" x1="4" y1="20" x2="24" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Axes */}
      <path d="M3.5 4V23.5H24.5" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      {/* Trend Area */}
      <path d="M5.5 19.5L10.5 14L15.5 16.5L23 6.5V23.5H5.5V19.5Z" fill="url(#sales-area)" />
      {/* Trend Line */}
      <path
        d="M5.5 19.5L10.5 14L15.5 16.5L23 6.5"
        stroke="url(#sales-line)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Points */}
      <circle cx="10.5" cy="14" r="1.8" fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="15.5" cy="16.5" r="1.8" fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
      {/* Upward Arrow at peak */}
      <circle cx="23" cy="6.5" r="2.5" fill="#059669" stroke="#FFFFFF" strokeWidth="1.2" />
    </svg>
  );
}

// 8. Catálogo Kiosco Táctil: High-tech touch kiosk monitor with interactive touch ripple
export function KioskTouchIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="kiosk-screen" x1="3" y1="3" x2="25" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
      {/* Monitor Screen Frame */}
      <rect x="2.5" y="3.5" width="23" height="15" rx="3" fill="url(#kiosk-screen)" stroke="#A78BFA" strokeWidth="1.2" />

      {/* Screen Interface items */}
      <rect x="5" y="6" width="5" height="4" rx="1" fill="#F472B6" />
      <rect x="11.5" y="6" width="5" height="4" rx="1" fill="#38BDF8" />
      <rect x="18" y="6" width="5" height="4" rx="1" fill="#FBBF24" />

      {/* Touch Interaction Ripple on screen */}
      <circle cx="14" cy="13.5" r="2" fill="#FFFFFF" fillOpacity="0.8" />
      <circle cx="14" cy="13.5" r="3.5" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />

      {/* Stand Neck and Base */}
      <path d="M12 18.5V23H16V18.5" fill="#475569" stroke="#334155" strokeWidth="0.8" />
      <rect x="8.5" y="23" width="11" height="2.5" rx="1.2" fill="#64748B" stroke="#334155" strokeWidth="0.8" />
    </svg>
  );
}

// 9. Reporte Mensual: Analytics report document with colorful vertical bars
export function MonthlyReportIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="rep-doc" x1="5" y1="2" x2="23" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>
      {/* Document Base */}
      <path
        d="M6 3.5C6 2.67 6.67 2 7.5 2H18.5L23 6.5V24.5C23 25.33 22.33 26 21.5 26H7.5C6.67 26 6 25.33 6 24.5V3.5Z"
        fill="url(#rep-doc)"
        stroke="#3B82F6"
        strokeWidth="1.2"
      />
      {/* Folded Corner */}
      <path d="M18 2V7H23" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="1" />

      {/* Document Header Line */}
      <rect x="9" y="5.5" width="6" height="2" rx="0.5" fill="#2563EB" />

      {/* Mini Bar Chart inside report */}
      <rect x="9" y="19" width="2" height="4" rx="0.5" fill="#3B82F6" />
      <rect x="12" y="15" width="2" height="8" rx="0.5" fill="#10B981" />
      <rect x="15" y="12" width="2" height="11" rx="0.5" fill="#F59E0B" />
      <rect x="18" y="17" width="2" height="6" rx="0.5" fill="#EF4444" />

      {/* Baseline */}
      <line x1="8" y1="23" x2="21" y2="23" stroke="#64748B" strokeWidth="0.8" />
    </svg>
  );
}

// 10. Cotizaciones: Proforma quote document with wax seal & fountain pen
export function QuotationIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="quote-bg" x1="4" y1="2" x2="22" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFBEB" />
          <stop offset="1" stopColor="#FEF3C7" />
        </linearGradient>
        <linearGradient id="quote-seal" x1="16" y1="16" x2="23" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {/* Quote Document */}
      <rect x="4.5" y="2.5" width="17" height="23" rx="2.5" fill="url(#quote-bg)" stroke="#D97706" strokeWidth="1.2" />

      {/* Header Banner */}
      <path d="M4.5 4.5C4.5 3.4 5.4 2.5 6.5 2.5H19.5C20.6 2.5 21.5 3.4 21.5 4.5V7.5H4.5V4.5Z" fill="#F59E0B" />
      <text x="13" y="6" fill="#FFFFFF" fontSize="2.8" fontWeight="bold" textAnchor="middle">
        COTIZACIÓN
      </text>

      {/* Lines of quote items */}
      <line x1="7.5" y1="10.5" x2="18.5" y2="10.5" stroke="#78350F" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="7.5" y1="13.5" x2="16.5" y2="13.5" stroke="#78350F" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="7.5" y1="16.5" x2="14.5" y2="16.5" stroke="#78350F" strokeWidth="1" strokeLinecap="round" opacity="0.6" />

      {/* Official Gold Seal / Stamp */}
      <circle cx="18.5" cy="19.5" r="4" fill="url(#quote-seal)" stroke="#92400E" strokeWidth="0.8" />
      <path d="M17 19.5L18.2 20.7L20.2 18.3" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 11. Papelera: Modern ruby recycle bin with lid
export function TrashBinIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="trash-body" x1="14" y1="9" x2="14" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EF4444" />
          <stop offset="1" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
      {/* Bin Handle & Lid */}
      <rect x="11.5" y="3" width="5" height="2" rx="0.5" fill="#DC2626" />
      <rect x="4.5" y="5.5" width="19" height="3" rx="1.5" fill="#EF4444" stroke="#F87171" strokeWidth="0.8" />

      {/* Can Body */}
      <path
        d="M6.5 8.5L7.8 24.2C7.9 25.2 8.7 26 9.7 26H18.3C19.3 26 20.1 25.2 20.2 24.2L21.5 8.5H6.5Z"
        fill="url(#trash-body)"
        stroke="#F87171"
        strokeWidth="0.8"
      />

      {/* Recycle Grooves */}
      <line x1="11" y1="12" x2="11" y2="22" stroke="#FCA5A5" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="12" x2="14" y2="22" stroke="#FCA5A5" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="17" y1="12" x2="17" y2="22" stroke="#FCA5A5" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 12. Facturas: Official fiscal invoice with barcode & SUNAT green stamp
export function InvoiceBillIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="inv-bg" x1="4" y1="2" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0F9FF" />
          <stop offset="1" stopColor="#E0F2FE" />
        </linearGradient>
      </defs>
      {/* Bill with zigzag / perforated edges at bottom */}
      <path
        d="M5 3.5C5 2.67 5.67 2 6.5 2H21.5C22.33 2 23 2.67 23 3.5V25L20 23.5L17 25L14 23.5L11 25L8 23.5L5 25V3.5Z"
        fill="url(#inv-bg)"
        stroke="#0284C7"
        strokeWidth="1.2"
      />

      {/* Top Banner with Currency */}
      <rect x="7" y="5" width="14" height="4" rx="1" fill="#0284C7" />
      <text x="14" y="8" fill="#FFFFFF" fontSize="3" fontWeight="bold" textAnchor="middle">
        FACTURA S/
      </text>

      {/* Barcode lines */}
      <rect x="7" y="11" width="1.2" height="5" fill="#0369A1" />
      <rect x="9" y="11" width="2" height="5" fill="#0369A1" />
      <rect x="12" y="11" width="1" height="5" fill="#0369A1" />
      <rect x="14" y="11" width="2.5" height="5" fill="#0369A1" />
      <rect x="18" y="11" width="1.5" height="5" fill="#0369A1" />

      {/* Authorized Check Stamp */}
      <circle cx="17.5" cy="19.5" r="3" fill="#10B981" />
      <path d="M16.2 19.5L17.2 20.5L18.8 18.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 13. Cuentas: Dual stacked financial cards & golden coin
export function AccountsFinanceIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="card-back" x1="2" y1="4" x2="22" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient id="card-front" x1="5" y1="9" x2="25" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      {/* Back Card */}
      <rect x="3" y="4" width="19" height="12" rx="2.5" fill="url(#card-back)" opacity="0.75" />

      {/* Front Card */}
      <rect x="6" y="9" width="19" height="13" rx="3" fill="url(#card-front)" stroke="#C4B5FD" strokeWidth="0.8" />
      {/* Gold Smart Chip */}
      <rect x="8.5" y="12" width="3.5" height="2.8" rx="0.6" fill="#FCD34D" stroke="#B45309" strokeWidth="0.4" />
      {/* Card number dots */}
      <circle cx="9" cy="18" r="0.8" fill="#DDD6FE" />
      <circle cx="11.5" cy="18" r="0.8" fill="#DDD6FE" />
      <circle cx="14" cy="18" r="0.8" fill="#DDD6FE" />

      {/* Shiny Gold Coin overlapping */}
      <circle cx="21" cy="19" r="4.5" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
      <circle cx="21" cy="19" r="3.2" stroke="#FDE68A" strokeWidth="0.6" />
      <text x="21" y="20.5" fill="#78350F" fontSize="3.5" fontWeight="bold" textAnchor="middle">
        $
      </text>
    </svg>
  );
}

// 14. Inventario: 3D Isometric warehouse storage crates
export function WarehouseInventoryIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="crate-top" x1="14" y1="2" x2="14" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="crate-left" x1="4" y1="8" x2="14" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="crate-right" x1="14" y1="8" x2="24" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E40AF" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>

      {/* Isometric Cube (Crate 1 - Center/Top) */}
      {/* Top face */}
      <path d="M14 3L23 8L14 13L5 8L14 3Z" fill="url(#crate-top)" stroke="#93C5FD" strokeWidth="0.8" />
      {/* Left face */}
      <path d="M5 8V18L14 23V13L5 8Z" fill="url(#crate-left)" stroke="#1E40AF" strokeWidth="0.8" />
      {/* Right face */}
      <path d="M14 13V23L23 18V8L14 13Z" fill="url(#crate-right)" stroke="#172554" strokeWidth="0.8" />

      {/* Warehouse reinforced strapping tape */}
      <path d="M14 3V13" stroke="#DBEAFE" strokeWidth="1" strokeDasharray="1.5 1" />
      <path d="M9.5 5.5L9.5 15.5L18.5 20.5" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.4" />
    </svg>
  );
}

// 15. Productos: Cardboard parcel package with sealing tape & arrow
export function ProductsPackageIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="pkg-top" x1="14" y1="3" x2="14" y2="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB923C" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
        <linearGradient id="pkg-left" x1="4" y1="9" x2="14" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EA580C" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
        <linearGradient id="pkg-right" x1="14" y1="9" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C2410C" />
          <stop offset="1" stopColor="#9A3412" />
        </linearGradient>
      </defs>

      {/* Package Isometric Shape */}
      <path d="M14 3.5L23.5 8.5L14 13.5L4.5 8.5L14 3.5Z" fill="url(#pkg-top)" stroke="#FDBA74" strokeWidth="0.8" />
      <path d="M4.5 8.5V19.5L14 24.5V13.5L4.5 8.5Z" fill="url(#pkg-left)" stroke="#9A3412" strokeWidth="0.8" />
      <path d="M14 13.5V24.5L23.5 19.5V8.5L14 13.5Z" fill="url(#pkg-right)" stroke="#7C2D12" strokeWidth="0.8" />

      {/* Sealing Tape */}
      <path d="M12 4.5L16 6.5L16 14.5L12 12.5L12 4.5Z" fill="#FDE047" opacity="0.8" />

      {/* Fragile / Up Arrow on box side */}
      <path d="M8 17V13M8 13L6.5 14.5M8 13L9.5 14.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 16. Categorías: Overlapping colorful merchandise labels / tags
export function CategoriesTagsIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="tag-back" x1="4" y1="3" x2="18" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#0D9488" />
        </linearGradient>
        <linearGradient id="tag-front" x1="8" y1="8" x2="25" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06B6D4" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>

      {/* Back Tag */}
      <path
        d="M12.5 3.5L4.5 11.5L12 19L20 11V3.5H12.5Z"
        fill="url(#tag-back)"
        stroke="#14B8A6"
        strokeWidth="0.8"
      />
      <circle cx="16" cy="7.5" r="1.5" fill="#CCFBF1" />

      {/* Front Tag */}
      <path
        d="M16.5 7.5L8.5 15.5L16.5 23.5L24.5 15.5V7.5H16.5Z"
        fill="url(#tag-front)"
        stroke="#38BDF8"
        strokeWidth="1"
      />
      <circle cx="20.5" cy="11.5" r="1.8" fill="#E0F2FE" />
      <line x1="13" y1="17.5" x2="18" y2="17.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 17. Descuentos de Stock: Fiery promo tag with percentage
export function DiscountsTagIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="disc-grad" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="0.6" stopColor="#EF4444" />
          <stop offset="1" stopColor="#DC2626" />
        </linearGradient>
      </defs>
      {/* Badge with serrated sale edges */}
      <path
        d="M14 2.5L17.5 5.5L22 4.5L23.5 9L27 12L25 16.5L26.5 21L22 22L19.5 26L14 24.5L8.5 26L6 22L1.5 21L3 16.5L1 12L4.5 9L6 4.5L10.5 5.5L14 2.5Z"
        fill="url(#disc-grad)"
        stroke="#FCA5A5"
        strokeWidth="1"
      />
      {/* Percentage Symbol */}
      <circle cx="11.5" cy="11.5" r="1.5" fill="#FFFFFF" />
      <line x1="10" y1="18" x2="18" y2="10" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16.5" cy="16.5" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

// 18. Seguimiento de Stock: Inventory radar scope with pulse blips
export function StockTrackerRadarIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="radar-bg" x1="14" y1="2" x2="14" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A" />
          <stop offset="1" stopColor="#1E293B" />
        </linearGradient>
        <radialGradient id="radar-sweep" cx="14" cy="14" r="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06B6D4" stopOpacity="0.7" />
          <stop offset="1" stopColor="#06B6D4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Scope Housing */}
      <circle cx="14" cy="14" r="11.5" fill="url(#radar-bg)" stroke="#0284C7" strokeWidth="1.5" />

      {/* Target Concentric Rings */}
      <circle cx="14" cy="14" r="8" stroke="#0284C7" strokeWidth="0.8" opacity="0.6" />
      <circle cx="14" cy="14" r="4.5" stroke="#0284C7" strokeWidth="0.8" opacity="0.6" />

      {/* Crosshairs */}
      <line x1="14" y1="3" x2="14" y2="25" stroke="#0EA5E9" strokeWidth="0.7" opacity="0.5" />
      <line x1="3" y1="14" x2="25" y2="14" stroke="#0EA5E9" strokeWidth="0.7" opacity="0.5" />

      {/* Radar Sweep Arc */}
      <path d="M14 14L22 7C24.5 10 25.5 14 25.5 14L14 14Z" fill="url(#radar-sweep)" />

      {/* Target Stock Blips */}
      <circle cx="18" cy="9.5" r="1.6" fill="#22C55E" />
      <circle cx="10" cy="17" r="1.4" fill="#F59E0B" />
      <circle cx="14" cy="14" r="1.8" fill="#38BDF8" />
    </svg>
  );
}

// 19. Reparaciones: Mechanical wrench and screwdriver in ergonomic chrome & amber
export function RepairsWrenchIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="wrench-metal" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="screw-metal" x1="24" y1="4" x2="4" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#94A3B8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Crossed Screwdriver */}
      <path
        d="M21.5 4.5L23.5 6.5L16 14L14 12L21.5 4.5Z"
        fill="#CBD5E1"
        stroke="#64748B"
        strokeWidth="0.8"
      />
      <path d="M14 12L7 19L5 23L9 21L16 14L14 12Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />

      {/* Crossed Adjustable Wrench */}
      <path
        d="M6.5 4.5C4.5 6.5 4.5 9.5 6.5 11.5L16.5 21.5L20 18L10 8C10.5 7 10 5.5 8.5 4C7.8 3.3 7 3.5 6.5 4.5Z"
        fill="url(#wrench-metal)"
        stroke="#B45309"
        strokeWidth="1"
      />
      {/* Wrench Jaw Cutout */}
      <path d="M6 5.5L7.5 7L5.5 9" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 20. Servicios Técnicos: Diagnostic checklist clipboard with checked boxes
export function TechServicesIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="serv-board" x1="4" y1="4" x2="24" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#3730A3" />
        </linearGradient>
      </defs>

      {/* Clipboard Board */}
      <rect x="4.5" y="4.5" width="19" height="21" rx="3" fill="url(#serv-board)" stroke="#818CF8" strokeWidth="1" />

      {/* Top Metallic Clamp */}
      <rect x="9.5" y="2" width="9" height="4.5" rx="1.5" fill="#CBD5E1" stroke="#64748B" strokeWidth="0.8" />
      <circle cx="14" cy="3.5" r="1" fill="#475569" />

      {/* Paper Sheet */}
      <rect x="6.5" y="8" width="15" height="15" rx="1.5" fill="#FFFFFF" />

      {/* Checklist Line 1 with Green Check */}
      <circle cx="9.5" cy="12" r="1.5" fill="#10B981" />
      <path d="M8.8 12L9.3 12.5L10.2 11.5" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="12.5" y1="12" x2="19.5" y2="12" stroke="#475569" strokeWidth="1" strokeLinecap="round" />

      {/* Checklist Line 2 with Green Check */}
      <circle cx="9.5" cy="16" r="1.5" fill="#10B981" />
      <path d="M8.8 16L9.3 16.5L10.2 15.5" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="12.5" y1="16" x2="19.5" y2="16" stroke="#475569" strokeWidth="1" strokeLinecap="round" />

      {/* Checklist Line 3 */}
      <circle cx="9.5" cy="20" r="1.5" fill="#0EA5E9" />
      <line x1="12.5" y1="20" x2="17.5" y2="20" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// 21. Usuarios: Multi-user avatars with golden superadmin crown
export function UsersAdminIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="user-crown" x1="14" y1="2" x2="14" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Secondary User (Back) */}
      <circle cx="19" cy="10" r="3" fill="#A78BFA" opacity="0.8" />
      <path d="M15 19C15 16.5 17 15 19 15C21 15 23 16.5 23 19" fill="#8B5CF6" opacity="0.8" />

      {/* Primary User (Front) */}
      <circle cx="11" cy="11.5" r="4" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1" />
      <path
        d="M5 23C5 19.5 7.5 17.5 11 17.5C14.5 17.5 17 19.5 17 23"
        fill="#4F46E5"
        stroke="#FFFFFF"
        strokeWidth="1"
      />

      {/* Golden SuperAdmin Crown on primary user */}
      <path
        d="M7.5 7L8.5 9.5L11 8L13.5 9.5L14.5 7L13.5 10.5H8.5L7.5 7Z"
        fill="url(#user-crown)"
        stroke="#B45309"
        strokeWidth="0.6"
      />
    </svg>
  );
}

// 22. Deudas: Calendar schedule with clock & payment slip alert
export function DebtsScheduleIcon({ size = 22, className = "" }: SidebarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${className}`}
    >
      <defs>
        <linearGradient id="cal-header" x1="4" y1="4" x2="24" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EF4444" />
          <stop offset="1" stopColor="#DC2626" />
        </linearGradient>
        <linearGradient id="clock-grad" x1="15" y1="13" x2="25" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Calendar back shadow */}
      <rect x="3" y="6" width="18" height="18" rx="3.5" fill="#1E293B" opacity="0.12" />

      {/* Calendar body */}
      <rect x="3.5" y="5.5" width="17" height="17" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />

      {/* Red Calendar Top Header */}
      <path d="M3.5 8.5C3.5 6.84315 4.84315 5.5 6.5 5.5H17.5C19.1569 5.5 20.5 6.84315 20.5 8.5V10.5H3.5V8.5Z" fill="url(#cal-header)" />

      {/* Binder rings */}
      <rect x="7" y="3.5" width="2" height="4" rx="1" fill="#475569" />
      <rect x="15" y="3.5" width="2" height="4" rx="1" fill="#475569" />

      {/* Grid lines on calendar */}
      <rect x="6.5" y="13.5" width="2.5" height="2" rx="0.5" fill="#94A3B8" />
      <rect x="10.5" y="13.5" width="2.5" height="2" rx="0.5" fill="#94A3B8" />
      <rect x="6.5" y="17.5" width="2.5" height="2" rx="0.5" fill="#94A3B8" />

      {/* Floating Clock / Due timer Badge */}
      <circle cx="19.5" cy="18.5" r="6" fill="#FFFFFF" stroke="#FDE68A" strokeWidth="1" />
      <circle cx="19.5" cy="18.5" r="4.8" fill="url(#clock-grad)" />
      {/* Clock hands */}
      <path d="M19.5 15.5V18.5L21.5 20" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
