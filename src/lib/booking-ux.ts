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
      title: "Aapki cab confirm ho gayi hai!",
      label: "CAB CONFIRM HAI",
      detail:
        "Aapki cab confirm hai. Neeche apni trip aur driver ki jaankari dekhein.",
      confirmed: true,
    };
  if (status === "completed")
    return {
      title: "Aapka safar poora ho gaya",
      label: "SAFAR POORA HUA",
      detail: "MarutiCab ke saath safar karne ke liye shukriya.",
      confirmed: false,
    };
  if (status === "cancelled")
    return {
      title: "Aapki request cancel ho gayi",
      label: "REQUEST CANCEL HUI",
      detail:
        "Yeh request cancel ho gayi hai. Payment ya doosri trip mein madad ke liye humse baat karein.",
      confirmed: false,
    };
  if (status === "refunded")
    return {
      title: "Aapka payment refund ho gaya",
      label: "PAYMENT REFUND HUA",
      detail:
        "Aapki booking ka status refunded hai. Payment ki jaankari ke liye humse baat karein.",
      confirmed: false,
    };
  if (status === "pending_payment")
    return {
      title: "Aapki cab request mil gayi hai!",
      label: "PAYMENT BAAKI HAI",
      detail:
        "Request bhejne ke liye advance payment poori karein. Aapki cab abhi confirm nahi hai.",
      confirmed: false,
    };
  if (status === "no_match_decision")
    return {
      title: "Return match abhi nahi mila",
      label: "ABHI CONFIRM NAHI",
      detail:
        "Sahi return trip ka match nahi mila. Apni request aur refund ke niyamon ke liye humse baat karein.",
      confirmed: false,
    };
  if (status === "matched")
    return {
      title: "Aapki cab request mil gayi hai!",
      label: "ABHI CONFIRM NAHI · MATCH MILA",
      detail:
        "Return trip ka match mil gaya hai. Final booking confirmation abhi baaki hai.",
      confirmed: false,
    };
  return {
    title: "Aapki cab request mil gayi hai!",
    label: "ABHI CONFIRM NAHI",
    detail:
      "Usi safar ki tareekh par sahi return passenger milne aur final booking confirmation ke baad hi cab confirm hogi. Tab tak safar ka backup plan bhi rakhein.",
    confirmed: false,
  };
}
