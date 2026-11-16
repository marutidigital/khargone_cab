"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Car, Clock, RefreshCw } from "lucide-react";
import { BOOKING_CONFIG } from "@/lib/config";
import { indiaDate } from "@/lib/booking-ux";

export interface PublicAvailableRide {
  id: string;
  direction: "KI" | "IK";
  routeDirection: "K2I" | "I2K";
  routeLabel: string;
  travelDate: string;
  travelDateFormatted: string;
  pickupTime: string;
  pickupTimeFormatted: string;
  passengerCount: number;
  dropPoint: string;
  dropName: string;
  totalFare: number;
  advanceAmount: number;
  oppositeDirection: "I2K" | "K2I";
  oppositeRouteLabel: string;
  oppositeBaseFare: number;
  statusText: string;
}

interface Props {
  onNewRequest?: () => void;
}
export function PublicRideMatchingBoard({ onNewRequest }: Props) {
  const [direction, setDirection] = useState<"ALL" | "I2K" | "K2I">("ALL");
  const [date, setDate] = useState("");
  const [rides, setRides] = useState<PublicAvailableRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/public/available-rides", {
          cache: "no-store",
          signal: abort.signal,
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.rides))
          throw new Error("Unavailable");
        if (!abort.signal.aborted) setRides(data.rides);
      } catch {
        if (!abort.signal.aborted) {
          setRides([]);
          setError(
            "Rides abhi load nahi ho paayin. Refresh karein ya humse baat karein.",
          );
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(
      () => setRefresh((value) => value + 1),
      20_000,
    );
    return () => {
      abort.abort();
      window.clearInterval(timer);
    };
  }, [refresh]);
  const visible = rides.filter(
    (ride) =>
      (direction === "ALL" || ride.oppositeDirection === direction) &&
      (!date || ride.travelDate === date),
  );
  const today = indiaDate();
  const newRequest = onNewRequest ? (
    <button
      type="button"
      onClick={onNewRequest}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
    >
      New Cab Request <ArrowRight className="h-4 w-4" />
    </button>
  ) : (
    <Link
      href="/#booking-section"
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
    >
      New Cab Request
    </Link>
  );
  return (
    <section
      id="confirmed-rides-board"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Return Matching
          </p>
          <h2 className="mt-2 text-2xl font-bold">Available Rides</h2>
        </div>
        <button
          type="button"
          onClick={() => setRefresh((value) => value + 1)}
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
        Kisi passenger ki opposite-direction request pehle se available hai.
        Apni date aur pickup time match karke booking request bhejein. Aapko
        sirf apni one-way trip book karni hai.
      </p>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
        <strong>Confirmation:</strong> Yeh matching opportunities hain, pehle se
        confirmed cabs nahi. Usi travel date par time aur booking checks poore
        hone ke baad hi final confirmation milegi.
      </div>
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Your travel route">
        {(["ALL", "K2I", "I2K"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={direction === value}
            onClick={() => setDirection(value)}
            className={`min-h-12 rounded-xl border px-4 py-3 text-sm font-bold ${direction === value ? "border-amber-400 bg-amber-400" : "border-slate-200"}`}
          >
            {value === "ALL"
              ? "All Routes"
              : value === "K2I"
                ? "Khargone → Indore"
                : "Indore → Khargone"}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">
          Travel Date
          <input
            type="date"
            min={today}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-2 block min-h-12 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
          />
        </label>
        <button
          type="button"
          aria-pressed={date === today}
          onClick={() => setDate(today)}
          className={`min-h-12 rounded-xl border px-4 text-sm font-bold ${date === today ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}
        >
          Today
        </button>
        <button
          type="button"
          aria-pressed={!date}
          onClick={() => setDate("")}
          className={`min-h-12 rounded-xl border px-4 text-sm font-bold ${!date ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}
        >
          All Dates
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Aaj aur future dates ki available rides yahan dikhti hain. List har 20
        seconds mein refresh hoti hai.
      </p>
      {loading ? (
        <p role="status" className="py-10 text-sm text-slate-600">
          Available rides check ho rahi hain…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
          <a
            href="tel:+917282316090"
            className="mt-2 flex min-h-11 items-center font-bold underline"
          >
            Call Support
          </a>
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h3 className="font-bold">No Available Rides</h3>
          <p className="mb-4 mt-2 text-sm leading-relaxed text-slate-600">
            Is route aur date ke liye abhi return match available nahi hai. All
            Dates check karein ya nayi cab request bhejein.
          </p>
          {newRequest}
        </div>
      ) : (
        <>
          <p role="status" className="mt-6 text-sm text-slate-500">
            {visible.length} available{" "}
            {visible.length === 1 ? "match" : "matches"}
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((ride) => (
              <article
                key={ride.id}
                className="min-w-0 rounded-2xl border border-slate-200 p-5"
              >
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">
                  Available Match
                </span>
                <p className="mt-4 text-xs font-semibold text-slate-500">
                  Your Route
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  {ride.oppositeRouteLabel}
                </h3>
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-4 w-4 shrink-0 text-amber-700" />
                  {ride.travelDateFormatted}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4 shrink-0" />
                  Opposite pickup: {ride.pickupTimeFormatted}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {ride.routeLabel} ki request available hai. Apna compatible
                  pickup time next step mein chunein.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Car className="h-4 w-4" />
                  Private AC Sedan · One-way Trip
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">Fare from</p>
                  <p className="mt-1 text-2xl font-black">
                    ₹
                    {BOOKING_CONFIG.matchDealBaseFares[
                      ride.oppositeDirection
                    ].toLocaleString("en-IN")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Final fare pickup time aur location ke hisaab se dikhega.
                  </p>
                  <Link
                    href={`/book-return/${encodeURIComponent(ride.id)}`}
                    className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold"
                  >
                    View & Book <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
