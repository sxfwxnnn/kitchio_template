import { Restaurant } from "@/types";

export interface OpeningStatus {
  isOpen: boolean;
  message: string;
  isNearingClose: boolean;
  minsToClose: number;
  reason: "temporarily_closed" | "public_holiday" | "outside_hours" | "none";
}

export function checkOpeningStatus(
  restaurant: Restaurant,
  temporarilyClosed: boolean,
  closedMessage?: string | null
): OpeningStatus {
  // 1. Temporarily Closed Toggle check
  if (temporarilyClosed) {
    return {
      isOpen: false,
      message: closedMessage || "We are temporarily closed - sorry for the inconvenience!",
      isNearingClose: false,
      minsToClose: 0,
      reason: "temporarily_closed",
    };
  }

  // 2. Public Holiday check
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format
  if (restaurant.publicHolidays && restaurant.publicHolidays.includes(dateStr)) {
    return {
      isOpen: false,
      message: "We're closed today for a public holiday.",
      isNearingClose: false,
      minsToClose: 0,
      reason: "public_holiday",
    };
  }

  // 3. Opening Hours check
  // Get current time details
  const currentHours = now.getHours();
  const currentMins = now.getMinutes();
  const currentTotalMins = currentHours * 60 + currentMins;

  // Assuming opening hours are constant or standard daily e.g. open at 12:00, close at 22:00
  // Let's assume opening is 12:00 (which is standard) or we get it from configuration. Let's make it 12:00 by default.
  const openTimeStr = "12:00";
  const closeTimeStr = restaurant.closesAt || "22:00";

  const [openH, openM] = openTimeStr.split(":").map(Number);
  const [closeH, closeM] = closeTimeStr.split(":").map(Number);

  const openTotalMins = openH * 60 + openM;
  const closeTotalMins = closeH * 60 + closeM;

  // If before opening hours
  if (currentTotalMins < openTotalMins) {
    return {
      isOpen: false,
      message: `We're closed. We open at ${openTimeStr} today!`,
      isNearingClose: false,
      minsToClose: 0,
      reason: "outside_hours",
    };
  }

  // If after closing hours
  if (currentTotalMins >= closeTotalMins) {
    return {
      isOpen: false,
      message: `We're closed. We reopen tomorrow at ${openTimeStr}!`,
      isNearingClose: false,
      minsToClose: 0,
      reason: "outside_hours",
    };
  }

  // 4. Within last orders threshold check
  const minsToClose = closeTotalMins - currentTotalMins;
  const warningThreshold = restaurant.lastOrderBeforeCloseMins || 15;
  const isNearingClose = minsToClose > 0 && minsToClose <= warningThreshold;

  return {
    isOpen: true,
    message: isNearingClose
      ? `Last orders in ${minsToClose} minutes!`
      : "We are open for orders!",
    isNearingClose,
    minsToClose,
    reason: "none",
  };
}
