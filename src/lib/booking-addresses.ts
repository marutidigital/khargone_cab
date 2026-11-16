export const INDORE_BOOKING_POINTS = [
  "rajendra",
  "railway",
  "airport",
] as const;
export const EXTRA_DISTANCE_NOTICE =
  "Custom pickup/drop ke extra km ka charge online fare mein shamil nahi hai. Driver actual extra distance ke hisaab se charge batayega.";
export function defaultAddresses(direction: string, indorePoint: string) {
  const khargone = "Bus Stand, Khargone";
  const indore = `${indorePoint}, Indore`;
  return direction === "K2I" || direction === "KI"
    ? { pickup: khargone, drop: indore }
    : { pickup: indore, drop: khargone };
}
export function parseDropAddress(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.trim().length > 250)
    throw new Error("Drop address must be text with at most 250 characters.");
  return value.trim() || undefined;
}
export function getBookingAddresses(booking: {
  direction: string;
  drop_name?: string | null;
  address?: string | null;
  extras?: { drop_address?: unknown } | null;
}) {
  const defaults = defaultAddresses(
    booking.direction,
    booking.drop_name || "Rajendra Nagar",
  );
  return {
    pickup: booking.address?.trim() || defaults.pickup,
    drop:
      typeof booking.extras?.drop_address === "string" &&
      booking.extras.drop_address.trim()
        ? booking.extras.drop_address
        : defaults.drop,
  };
}
