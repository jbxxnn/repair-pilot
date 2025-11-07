/**
 * Currency and number formatting utilities
 */

/**
 * Formats a number as currency (USD)
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$123.45")
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return "$0.00";
  }
  
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return "$0.00";
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Formats a phone number by removing non-digits and applying basic formatting
 * @param phone - The phone number string to format
 * @returns Formatted phone number (e.g., "+1234567890" or "1234567890")
 */
export function formatPhoneNumber(phone: string | null | undefined): string | undefined {
  if (!phone) {
    return undefined;
  }
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");
  
  // If it starts with +, keep it; otherwise ensure it's just digits
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  
  // Return cleaned digits (Shopify will handle formatting)
  return cleaned;
}

/**
 * Calculates the remaining amount after deposit
 * @param quotedAmount - The quoted/estimated amount (can be 0 or null/undefined)
 * @param depositAmount - The deposit amount paid
 * @returns The remaining amount (never negative)
 */
export function calculateRemainingAmount(
  quotedAmount: number | null | undefined,
  depositAmount: number
): number {
  const quoted = quotedAmount ?? 0;
  const deposit = depositAmount ?? 0;
  const remaining = quoted - deposit;
  
  // Never return negative amounts
  return Math.max(0, remaining);
}

/**
 * Validates if an amount is valid (non-negative number)
 * @param amount - The amount to validate
 * @returns true if valid, false otherwise
 */
export function isValidAmount(amount: number | string | null | undefined): boolean {
  if (amount === null || amount === undefined) {
    return false;
  }
  
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return false;
  }
  
  // Amount must be non-negative
  return numAmount >= 0;
}


