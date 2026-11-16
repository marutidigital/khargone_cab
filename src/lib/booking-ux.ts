export function indiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function timePeriod(time: string) {
  const hour = Number(time.split(":")[0]);
  return hour >= 5 && hour < 12
    ? "Morning"
    : hour < 17 && hour >= 12
      ? "Afternoon"
      : hour >= 17 && hour < 21
        ? "Evening"
        : "Night";
}
export function timeLabel(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
export function customerStatus(status: string) {
  if (status === "confirmed")
    return {
      title: "आपकी Cab Confirm हो गई है!",
      label: "CONFIRMED",
      detail:
        "Your cab request is confirmed. Check your journey and driver details below.",
      confirmed: true,
    };
  if (status === "completed")
    return {
      title: "यात्रा पूरी हो गई",
      label: "COMPLETED",
      detail: "Thank you for travelling with MarutiCab.",
      confirmed: false,
    };
  if (status === "cancelled")
    return {
      title: "Request cancelled",
      label: "CANCELLED",
      detail:
        "This request is cancelled. Contact us for help with your payment or another journey.",
      confirmed: false,
    };
  if (status === "refunded")
    return {
      title: "Payment refunded",
      label: "REFUNDED",
      detail:
        "Your booking is marked refunded. Contact support for payment details.",
      confirmed: false,
    };
  if (status === "pending_payment")
    return {
      title: "आपकी Cab Request मिल गई है!",
      label: "PAYMENT PENDING",
      detail:
        "Complete the advance payment to submit your request. Your cab is not confirmed yet.",
      confirmed: false,
    };
  if (status === "no_match_decision")
    return {
      title: "Return match अभी नहीं मिला",
      label: "UNCONFIRMED",
      detail:
        "A compatible return journey was not found. Contact us to discuss your request and the existing refund policy.",
      confirmed: false,
    };
  if (status === "matched")
    return {
      title: "आपकी Cab Request मिल गई है!",
      label: "UNCONFIRMED · MATCH FOUND",
      detail:
        "A return journey has been matched. Final booking confirmation is still pending.",
      confirmed: false,
    };
  return {
    title: "आपकी Cab Request मिल गई है!",
    label: "UNCONFIRMED",
    detail:
      "उसी travel date पर compatible return passenger मिलने और booking confirmation के बाद ही cab confirm होगी। Until then, please keep a backup travel plan.",
    confirmed: false,
  };
}
