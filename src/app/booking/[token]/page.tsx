"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import { BookingHeader } from "@/components/booking/BookingHeader";
import { customerStatus } from "@/lib/booking-ux";

interface DriverInfo {
  id?: string;
  name: string;
  phone: string;
  vehicle_number: string;
  vehicle_model?: string;
}

interface BookingView {
  id: string;
  booking_ref: string;
  mode: string;
  status: string;
  direction: string;
  drop_name: string;
  address?: string | null;
  travel_date: string;
  pickup_time: string;
  passenger_count: number;
  passenger_name: string;
  phone: string;
  masked_phone?: string;
  total_fare: number;
  advance_amount: number;
  advance_paid: number;
  balance_amount: number;
  cutoff_at?: string | null;
  refund_status?: string;
  driver_name?: string | null;
  driver?: DriverInfo | null;
  created_at?: string;
}

const SUPPORT_PHONE = "+917282316090";
const SUPPORT_WA = "917282316090";

export default function BookingConfirmationPage() {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBooking = useCallback(
    async (showIndicator = false) => {
      if (!token) return;
      if (showIndicator) setIsRefreshing(true);
      try {
        const res = await fetch(`/api/booking/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Booking ki jaankari nahi khul paayi.");
        } else {
          setBooking(data.booking);
          setError("");
        }
      } catch {
        setError(
          "Booking nahi khul paayi. Apna internet check karein.",
        );
      } finally {
        setLoading(false);
        if (showIndicator) setIsRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadBooking();
    // Live polling: 3s if pending confirmation, otherwise 10s
    const pollInterval = booking?.status === "pending_payment" ? 3_000 : 10_000;
    const interval = window.setInterval(() => {
      void loadBooking();
    }, pollInterval);
    return () => window.clearInterval(interval);
  }, [loadBooking, booking?.status]);

  const copyRef = () => {
    if (!booking?.booking_ref) return;
    navigator.clipboard.writeText(booking.booking_ref).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const formatPickupDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(`${dateStr}T12:00:00+05:30`);
      return new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatPickupTime12h = (timeStr?: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    if (Number.isNaN(h)) return timeStr;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${period}`;
  };

  const status = customerStatus(booking?.status || "");
  const route =
    booking?.direction === "KI" || booking?.direction === "K2I"
      ? "Khargone → Indore"
      : "Indore → Khargone";
  const money = (value: number) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;
  const whatsappUrl = `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(`Namaste MarutiCab, is request mein madad chahiye: #${booking?.booking_ref || ""}, ${route}, ${booking?.travel_date || ""} at ${booking?.pickup_time || ""}.`)}`;
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-slate-950">
      <BookingHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {loading ? (
          <p role="status" className="rounded-3xl border bg-white p-8">
            Aapki request khul rahi hai…
          </p>
        ) : error ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-6">
            <h1 className="text-xl font-bold">Aapki request nahi khul paayi</h1>
            <p role="alert" className="mt-3 text-rose-700">
              {error}
            </p>
            <button
              className="booking-primary mt-5"
              onClick={() => void loadBooking(true)}
            >
              Dobara koshish karein
            </button>
            <a
              className="mt-4 flex min-h-12 items-center justify-center underline"
              href={whatsappUrl}
            >
              WhatsApp par madad lein
            </a>
          </section>
        ) : (
          booking && (
            <div className="space-y-5">
              <section
                className={`rounded-3xl border bg-white p-6 sm:p-8 ${status.confirmed ? "border-emerald-300" : "border-amber-300"}`}
              >
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${status.confirmed ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"}`}
                >
                  {status.confirmed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  {status.label}
                </span>
                <h1 className="mt-5 text-2xl font-bold leading-relaxed sm:text-3xl">
                  {status.title}
                </h1>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  {status.detail}
                </p>
                <p className="mt-4 text-sm text-slate-500">
                  Yahan aapki booking ka abhi ka status dikhta hai. Sirf payment ya return match se cab confirm nahi hoti.
                </p>
                <button
                  type="button"
                  disabled={isRefreshing}
                  onClick={() => void loadBooking(true)}
                  className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? "Check ho raha hai…" : "Abhi ka status dekhein"}
                </button>
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">Aapki trip</h2>
                  <button
                    onClick={copyRef}
                    className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copy ho gaya" : `#${booking.booking_ref}`}
                  </button>
                </div>
                <h3 className="mt-4 text-xl font-bold">{route}</h3>
                <dl className="mt-5 space-y-4 text-sm">
                  {[
                    ["Indore mein jagah", booking.drop_name],
                    ["Safar ki tareekh", formatPickupDate(booking.travel_date)],
                    [
                      "Pickup ka sahi time",
                      `${formatPickupTime12h(booking.pickup_time)} IST`,
                    ],
                    ["Yatri ka naam", booking.passenger_name],
                    ["WhatsApp", booking.masked_phone || booking.phone],
                    ["Kitne log safar karenge?", booking.passenger_count],
                    ...(booking.address
                      ? [["Pickup ki pehchaan", booking.address]]
                      : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="min-w-0 text-right font-semibold break-words">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <h2 className="font-bold">Payment ki jaankari</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ["Kul kiraya", booking.total_fare],
                    ["Advance mil gaya", booking.advance_paid],
                    [
                      "Baaki kiraya",
                      Math.max(
                        0,
                        Number(booking.total_fare) -
                          Number(booking.advance_paid || 0),
                      ),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="flex justify-between gap-3"
                    >
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="font-bold">{money(Number(value))}</dd>
                    </div>
                  ))}
                </dl>
                {booking.refund_status && (
                  <p className="mt-4 text-sm">
                    Refund ka status: {booking.refund_status}
                  </p>
                )}
                <Link
                  href="/refund"
                  className="mt-4 inline-flex min-h-11 items-center text-sm underline"
                >
                  Refund ke niyam dekhein
                </Link>
              </section>
              {booking.driver && (
                <section className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h2 className="font-bold">Driver aur gaadi ki jaankari</h2>
                  <p className="mt-3">{booking.driver.name}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {booking.driver.vehicle_model} ·{" "}
                    {booking.driver.vehicle_number}
                  </p>
                  <a
                    className="mt-3 inline-flex min-h-12 items-center gap-2 font-bold"
                    href={`tel:${booking.driver.phone}`}
                  >
                    <Phone className="h-4 w-4" />
                    Driver ko call karein
                  </a>
                </section>
              )}
              <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <h2 className="font-bold">Is request mein madad chahiye?</h2>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={whatsappUrl}
                  className="booking-primary mt-4"
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp par madad lein
                </a>
                <a
                  className="mt-3 flex min-h-12 items-center justify-center font-bold"
                  href={`tel:${SUPPORT_PHONE}`}
                >
                  Call karein: +91 72823 16090
                </a>
              </section>
              <p className="text-center text-sm leading-relaxed text-slate-500">
                Apni request check karne ke liye yeh private link sambhal kar rakhein. Updates WhatsApp par bhi milenge.
              </p>
              <Link
                href="/"
                className="flex min-h-12 items-center justify-center text-sm font-bold underline"
              >
                MarutiCab par wapas jaayein
              </Link>
            </div>
          )
        )}
      </main>
    </div>
  );
}
