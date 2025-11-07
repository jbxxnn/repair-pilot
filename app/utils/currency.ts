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
 * Formats a phone number for Shopify API
 * Shopify requires E.164 format (e.g., +1234567890) or valid digit-only format
 * @param phone - The phone number string to format
 * @returns Formatted phone number in E.164 format, or undefined if invalid/empty
 */
export function formatPhoneNumber(phone: string | null | undefined): string | undefined {
  if (!phone) {
    return undefined;
  }
  
  // Remove all whitespace and non-digit characters except +
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  
  // If empty after cleaning, return undefined
  if (!cleaned || cleaned === "+") {
    return undefined;
  }
  
  // If it already starts with +, validate it's in E.164 format
  if (cleaned.startsWith("+")) {
    // E.164 format: + followed by 1-15 digits
    const digitsAfterPlus = cleaned.substring(1);
    if (digitsAfterPlus.length >= 1 && digitsAfterPlus.length <= 15 && /^\d+$/.test(digitsAfterPlus)) {
      return cleaned;
    }
    // Invalid E.164 format
    console.warn(`Invalid phone number format (E.164): ${phone} -> ${cleaned}`);
    return undefined;
  }
  
  // If it's just digits, try to format it
  // For North American numbers (10 digits), assume +1 country code
  if (/^\d+$/.test(cleaned)) {
    // If it's 10 digits (North American), add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    // If it's 11 digits and starts with 1 (North American), add +
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    }
    // If it's 7-15 digits, assume it's a valid international number without country code
    // But Shopify might reject this, so let's be conservative
    if (cleaned.length >= 7 && cleaned.length <= 15) {
      // Try to add + if it looks like it might be international
      // But this is risky - better to return undefined for ambiguous cases
      console.warn(`Ambiguous phone number format: ${phone} -> ${cleaned}. Please use E.164 format (+countrycode+number)`);
      return undefined;
    }
    
    // Too short or too long
    console.warn(`Invalid phone number length: ${phone} -> ${cleaned} (${cleaned.length} digits)`);
    return undefined;
  }
  
  // Contains invalid characters
  console.warn(`Invalid phone number characters: ${phone} -> ${cleaned}`);
  return undefined;
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


