import Link from "next/link";
import { Car, Phone, MessageCircle } from "lucide-react";
export function BookingHeader({
  whatsappUrl = "https://wa.me/917282316090",
}: {
  whatsappUrl?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 font-black text-xl tracking-tight"
        >
          <span className="rounded-xl bg-amber-400 p-2">
            <Car className="h-6 w-6" />
          </span>
          MarutiCab<span className="sr-only">Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp Support"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
          <a
            href="tel:+917282316090"
            aria-label="Call Us"
            className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Call Us</span>
          </a>
        </div>
      </div>
    </header>
  );
}
