"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  Clock,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { BookingHeader } from "./BookingHeader";
import { BookingPaymentPanel } from "./BookingPaymentPanel";
import {
  BOOKING_CONFIG,
  calculateBookingFare,
  parsePickupDateTime,
  type DropPointId,
  type RouteDirection,
} from "@/lib/config";
import { PRICING_CONFIG } from "@/config/pricing";
import {
  addCalendarDays,
  indiaDate,
  timeLabel,
  timePeriod,
} from "@/lib/booking-ux";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
const steps = ["Select Route", "Date & Time", "Your Details"];
export function PremiumBookingExperience() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<RouteDirection>("K2I");
  const [point, setPoint] = useState<DropPointId>("rajendra");
  const [date, setDate] = useState(indiaDate);
  const [time, setTime] = useState("");
  const [period, setPeriod] = useState("Morning");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [consent, setConsent] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recentToken, setRecentToken] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const request = useRef({ fingerprint: "", key: "" });
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    setRecentToken(sessionStorage.getItem("maruticab_booking_token") || "");
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const today = indiaDate(new Date(now));
  const maxDate = addCalendarDays(today, BOOKING_CONFIG.maxAdvanceDays);
  const route = direction === "K2I" ? "Khargone → Indore" : "Indore → Khargone";
  const location = PRICING_CONFIG.points.find((entry) => entry.id === point)!;
  const fare = useMemo(
    () =>
      calculateBookingFare({
        mode: "match",
        direction,
        point,
        pickupTime: time || "12:00",
      }),
    [direction, point, time],
  );
  const pickup = time ? parsePickupDateTime(date, time) : null;
  const timeValid = Boolean(
    pickup && pickup.getTime() > now && date >= today && date <= maxDate,
  );
  const valid =
    timeValid &&
    name.trim().length >= 2 &&
    /^[6-9]\d{9}$/.test(phone) &&
    consent;
  const dateLabel = new Date(`${date}T12:00:00+05:30`).toLocaleDateString(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
  const whatsapp = `https://wa.me/917282316090?text=${encodeURIComponent(`Namaste MarutiCab, mujhe ${route} ki booking mein madad chahiye. Indore mein jagah: ${location.name}. Safar ki tareekh: ${date}${time ? `, pickup ka time: ${timeLabel(time)}` : ""}.`)}`;
  const move = (next: number) => {
    if (paymentBusy || submitting) return;
    setStep(next);
    setError("");
    requestAnimationFrame(() => {
      title.current?.focus();
      document
        .getElementById("booking-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const payload = () => {
    const data = {
      direction,
      mode: "match",
      point,
      date,
      time,
      name: name.trim(),
      phone,
      passengers,
      address,
      consent,
    };
    const fingerprint = JSON.stringify(data);
    if (request.current.fingerprint !== fingerprint)
      request.current = { fingerprint, key: crypto.randomUUID() };
    sessionStorage.setItem(
      "maruticab_checkout_state",
      JSON.stringify({ ...data, pointId: point }),
    );
    return { ...data, idempotencyKey: request.current.key };
  };
  const input =
    "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
  const selected = (active: boolean) =>
    `min-h-14 rounded-xl border p-3 text-left transition ${active ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-slate-200 bg-white hover:border-slate-400"}`;
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-slate-950">
      <BookingHeader whatsappUrl={whatsapp} />
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            KHARGONE ↔ INDORE · PRIVATE AC SEDAN
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Apni trip chunein.
            <br />
            <span className="text-slate-500">Baaki hum aasaan karenge.</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Apni private cab ke liye sirf 3 aasaan steps mein request bhejein.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            {["Private Sedan", "One-way Fare", "Clear Pricing"].map((text) => (
              <span key={text} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-amber-700" />
                {text}
              </span>
            ))}
          </div>
        </div>
        {recentToken && (
          <Link
            href={`/booking/${encodeURIComponent(recentToken)}`}
            className="mb-6 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold"
          >
            View Request Status <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section
            id="booking-section"
            className="min-w-0 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          >
            <ol
              aria-label="Booking Progress"
              className="mb-8 grid grid-cols-3 gap-2"
            >
              {steps.map((label, index) => (
                <li key={label}>
                  <button
                    type="button"
                    disabled={index > step || paymentBusy || submitting}
                    onClick={() => move(index)}
                    aria-current={step === index ? "step" : undefined}
                    className={`flex min-h-12 w-full items-center gap-2 border-b-2 pb-3 text-left text-xs font-bold sm:text-sm ${index === step ? "border-amber-400 text-slate-950" : "border-slate-100 text-slate-500"}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${index <= step ? "bg-amber-400 text-slate-950" : "bg-slate-100"}`}
                    >
                      {index < step ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span>{label}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Step {step + 1} / 3
            </p>
            <h2
              ref={title}
              tabIndex={-1}
              className="mt-2 text-2xl font-bold outline-none"
            >
              {step === 2 ? "Review & Pay" : steps[step]}
            </h2>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-slate-500">
              {
                [
                  "Apna route aur Indore mein pickup ya drop ki jagah chunein.",
                  "Safar ki tareekh aur pickup ka sahi time chunein.",
                  "Apni trip details check karein aur cab request bhejein.",
                ][step]
              }
            </p>
            {step === 0 && (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["K2I", "I2K"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={direction === value}
                      onClick={() => {
                        setDirection(value);
                        setTime("");
                      }}
                      className={selected(direction === value)}
                    >
                      <Car className="mb-3 h-5 w-5 text-amber-700" />
                      <span className="block font-bold">
                        {value === "K2I"
                          ? "Khargone → Indore"
                          : "Indore → Khargone"}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {money(BOOKING_CONFIG.matchDealBaseFares[value])} se ·
                        private sedan
                      </span>
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-semibold">
                  Indore {direction === "K2I" ? "Drop" : "Pickup"} Location
                  <select
                    value={point}
                    onChange={(event) =>
                      setPoint(event.target.value as DropPointId)
                    }
                    className={input}
                  >
                    {PRICING_CONFIG.points.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} —{" "}
                        {
                          {
                            rajendra: "Shehar ka drop",
                            bhawarkua: "AB Road ki location",
                            rajwada: "Purana shehar / bazaar",
                            railway: "Indore Junction",
                            airport: "Devi Ahilya Airport",
                          }[entry.id]
                        }
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end justify-between gap-3 rounded-2xl bg-slate-50 p-5">
                  <div>
                    <p className="text-sm text-slate-500">One-way Fare</p>
                    <p className="mt-1 text-3xl font-black">
                      {money(fare.totalFare)}
                    </p>
                  </div>
                  <span className="text-right text-xs leading-relaxed text-slate-500">
                    AC sedan · toll kiraye mein shamil
                    <br />
                    Raat ke pickup par extra charge lagega
                  </span>
                </div>
                <button onClick={() => move(1)} className="booking-primary">
                  Continue <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map((offset) => {
                    const value = addCalendarDays(today, offset);
                    return (
                      <button
                        key={offset}
                        onClick={() => {
                          setDate(value);
                          setTime("");
                        }}
                        aria-pressed={date === value}
                        className={selected(date === value)}
                      >
                        <span className="block font-bold">
                          {offset ? "Tomorrow" : "Today"}
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {new Date(
                            `${value}T12:00:00+05:30`,
                          ).toLocaleDateString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label className="block text-sm font-semibold">
                  Travel Date
                  <input
                    className={input}
                    type="date"
                    min={today}
                    max={maxDate}
                    value={date}
                    onChange={(event) => {
                      if (event.target.value) {
                        setDate(event.target.value);
                        setTime("");
                      }
                    }}
                  />
                </label>
                <fieldset>
                  <legend className="mb-3 text-sm font-semibold">
                    Time of Day
                  </legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {["Morning", "Afternoon", "Evening", "Night"].map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={period === value}
                          onClick={() => setPeriod(value)}
                          className={selected(period === value)}
                        >
                          {
                            {
                              Morning: "Morning",
                              Afternoon: "Afternoon",
                              Evening: "Evening",
                              Night: "Night",
                            }[value]
                          }
                        </button>
                      ),
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {BOOKING_CONFIG.matchDepartures[direction]
                      .filter((value) => timePeriod(value) === period)
                      .map((value) => (
                        <button
                          type="button"
                          key={value}
                          disabled={Boolean(
                            parsePickupDateTime(date, value) &&
                            parsePickupDateTime(date, value)!.getTime() <= now,
                          )}
                          aria-pressed={time === value}
                          onClick={() => setTime(value)}
                          className={`${selected(time === value)} disabled:opacity-40`}
                        >
                          {timeLabel(value)}
                        </button>
                      ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Upar diye gaye time mein se chunein, ya neeche apna sahi
                    pickup time bharein. Sirf din ka hissa chunne se pickup time
                    select nahi hota.
                  </p>
                </fieldset>
                <label className="block text-sm font-semibold">
                  Pickup Time
                  <input
                    type="time"
                    step={60}
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className={input}
                  />
                </label>
                <p className="text-sm text-slate-500">
                  Raat ka pickup (9 PM–4 AM): +
                  {money(BOOKING_CONFIG.nightSurcharge)}. Saare time India ke
                  time ke hisaab se hain.
                </p>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                  <Clock className="mb-2 h-5 w-5" />
                  Aapki request abhi confirm nahi hai. Usi tareekh par sahi
                  return passenger milne aur final confirmation ke baad hi cab
                  confirm hogi.
                </div>
                {error && (
                  <p role="alert" className="text-sm text-rose-700">
                    {error}
                  </p>
                )}
                <button
                  onClick={() =>
                    timeValid
                      ? move(2)
                      : setError(
                          "Aane wali tareekh aur abhi ke baad ka sahi pickup time chunein.",
                        )
                  }
                  className="booking-primary"
                >
                  Continue <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}
            {error && step === 2 && (
              <p role="alert" className="my-4 text-sm text-rose-700">
                {error}
              </p>
            )}
            {step === 2 && (
              <fieldset
                disabled={paymentBusy || submitting}
                className="min-w-0 space-y-5"
              >
                <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                  <p className="font-bold">{route}</p>
                  <p className="mt-2 text-slate-600">
                    {location.name} · {dateLabel}
                  </p>
                  <p className="mt-1 font-semibold">
                    Pickup: {timeLabel(time)}
                  </p>
                  <p className="mt-2 text-slate-500">
                    Private AC sedan · toll kiraye mein shamil · kiraya{" "}
                    {money(fare.totalFare)}
                  </p>
                  <button
                    onClick={() => move(1)}
                    className="mt-2 min-h-11 font-bold underline underline-offset-4"
                  >
                    Edit Trip
                  </button>
                </div>
                <label className="block text-sm font-semibold">
                  Full Name
                  <input
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={input}
                    placeholder="Enter your name"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  WhatsApp number · +91
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    className={input}
                    placeholder="10-digit mobile number"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Pickup Address / Landmark{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                  <input
                    autoComplete="street-address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className={input}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Passengers
                  <select
                    value={passengers}
                    onChange={(event) =>
                      setPassengers(Number(event.target.value))
                    }
                    className={input}
                  >
                    {[1, 2, 3, 4].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-amber-500"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    Main samajhta/samajhti hoon ki meri{" "}
                    <strong>cab request abhi confirm nahi hai</strong>. Usi
                    tareekh par sahi return trip ka match aur final confirmation
                    zaroori hai. Main WhatsApp updates aur in{" "}
                    <Link href="/terms" className="underline">
                      sharton
                    </Link>{" "}
                    aur{" "}
                    <Link href="/refund" className="underline">
                      refund policy
                    </Link>{" "}
                    se sehmat hoon.
                  </span>
                </label>
                {!valid && (
                  <p className="text-sm text-slate-600">
                    {!timeValid
                      ? "Aapka pickup time nikal gaya hai. Trip ka time badlein."
                      : "Aage badhne ke liye naam, sahi 10 digit ka WhatsApp number bharein aur shartein maan lein."}
                  </p>
                )}
                <BookingPaymentPanel
                  mode="match"
                  breakdown={fare}
                  dateLabel={dateLabel}
                  timeLabel={timeLabel(time)}
                  isValid={valid}
                  onBusyChange={setPaymentBusy}
                  isSubmitting={submitting}
                  passengerName={name}
                  passengerPhone={phone}
                  getBookingPayload={payload}
                  onPaymentSuccess={async (payment) => {
                    if (payment.publicToken) {
                      router.push(
                        `/booking/${encodeURIComponent(payment.publicToken)}`,
                      );
                      return;
                    }
                    setSubmitting(true);
                    try {
                      const response = await fetch("/api/bookings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          ...payload(),
                          paymentOrderId: payment.orderId,
                          paymentId: payment.paymentId,
                          paymentSignature: payment.signature,
                          advancePaid: payment.advancePaid,
                          couponCode: payment.couponCode,
                        }),
                      });
                      const result = await response.json();
                      if (!response.ok || !result.publicToken)
                        throw new Error(
                          result.error ||
                            "Payment wali request check karne ke liye humse baat karein.",
                        );
                      sessionStorage.setItem(
                        "maruticab_booking_token",
                        result.publicToken,
                      );
                      router.push(
                        `/booking/${encodeURIComponent(result.publicToken)}`,
                      );
                    } catch (failure) {
                      setError(
                        failure instanceof Error
                          ? failure.message
                          : "Payment wali request nahi khul paayi. Dobara payment karne se pehle humse baat karein.",
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  bookingLabel="Private Cab Request"
                />
              </fieldset>
            )}
            {step > 0 && (
              <button
                type="button"
                disabled={paymentBusy || submitting}
                onClick={() => move(step - 1)}
                className="mt-5 inline-flex min-h-12 items-center gap-2 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </section>
          <aside className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <ShieldCheck className="h-7 w-7 text-amber-400" />
              <h2 className="mt-4 text-xl font-bold">
                Aapki apni cab,
                <br />
                aasaan booking.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                1. Apni trip chunein
                <br />
                2. Advance dekar request bhejein
                <br />
                3. Final confirmation ka intezaar karein
              </p>
              <p className="mt-5 border-t border-slate-700 pt-4 text-sm leading-relaxed text-amber-200">
                Sirf payment se cab confirm nahi hoti. Hum aapko WhatsApp par
                update denge.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold">Madad chahiye? Hum hain na.</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Upar online request bhejein, ya trip details humse share karein.
              </p>
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-bold"
              >
                <MessageCircle className="h-5 w-5" />
                Book on WhatsApp
              </a>
              <a
                href="tel:+917282316090"
                className="mt-2 flex min-h-12 items-center justify-center text-sm font-bold"
              >
                Call +91 72823 16090
              </a>
            </div>
          </aside>
        </div>
        <footer className="mt-10 flex flex-wrap gap-5 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <span>© MarutiCab</span>
          <Link className="min-h-11" href="/confirmed-rides">
            Available Return Rides
          </Link>
          <Link className="min-h-11" href="/terms">
            Terms
          </Link>
          <Link className="min-h-11" href="/refund">
            Refund Policy
          </Link>
          <Link className="min-h-11" href="/privacy">
            Privacy
          </Link>
          <Link className="min-h-11" href="/my-rides">
            My Requests
          </Link>
        </footer>
      </main>
    </div>
  );
}
