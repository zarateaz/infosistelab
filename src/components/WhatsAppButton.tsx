import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

// Sits directly above the AI ChatBot bubble (same 56px size, same right-6
// offset, one slot higher at bottom-24) so a visitor can go straight to a
// human on WhatsApp instead of spending tokens on the AI assistant for
// anything more than a quick catalog/hours question.
export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/51900000000"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed right-4 sm:right-6 z-30 sm:z-40 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105 active:scale-95 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6rem+env(safe-area-inset-bottom))]"
    >
      <WhatsAppIcon size={22} className="sm:hidden" />
      <WhatsAppIcon size={24} className="hidden sm:block" />
    </a>
  );
}
