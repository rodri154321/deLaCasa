/**
 * Safely formats a number to a fixed decimal string
 * @param value - The value to format (can be number, string, null, undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function safeToFixed(value: any, decimals: number = 2): string {
  const num = Number(value || 0);
  return num.toFixed(decimals);
}