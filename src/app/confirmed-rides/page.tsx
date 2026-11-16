import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BookingHeader } from "@/components/booking/BookingHeader";
import { PublicRideMatchingBoard } from "@/components/booking/PublicRideMatchingBoard";
export default function ConfirmedRidesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-slate-950">
      <BookingHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="mb-5 inline-flex min-h-12 items-center gap-2 text-sm font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Booking
        </Link>
        <h1 className="mb-5 text-3xl font-bold">Confirmed Booking</h1>
        <PublicRideMatchingBoard />
      </main>
    </div>
  );
}
