import { NativeDateAdapter } from '@angular/material/core';

/**
 * Custom DateAdapter that parses dates in dd/mm/yyyy format
 * when users manually type into the date input field.
 */
export class AppDateAdapter extends NativeDateAdapter {
  /**
   * Override parse to handle dd/mm/yyyy format.
   * Falls back to the native parser for other formats (e.g., ISO yyyy-mm-dd).
   */
  override parse(value: any): Date | null {
    // If it's already a Date, return as-is
    if (value instanceof Date) {
      return this.isValid(value) ? value : null;
    }

    // If it's a number (timestamp), use native parsing
    if (typeof value === 'number') {
      return new Date(value);
    }

    // Only handle string values
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    const trimmed = value.trim();

    // Try dd/mm/yyyy format (e.g., "12/02/2027" → 12th Feb 2027)
    const ddMmYyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddMmYyyyMatch) {
      const day = parseInt(ddMmYyyyMatch[1], 10);
      const month = parseInt(ddMmYyyyMatch[2], 10) - 1; // JS months are 0-indexed
      const year = parseInt(ddMmYyyyMatch[3], 10);
      const date = new Date(year, month, day);

      // Validate the date is correct (handles overflow like 32/01/2027)
      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date;
      }
      return null;
    }

    // Fall back to native parsing for other formats (e.g., "2027-02-12", "Feb 12, 2027")
    return super.parse(value);
  }

  /**
   * Override format to ensure consistent dd/mm/yyyy output.
   */
  override format(date: Date, displayFormat: any): string {
    if (displayFormat === 'DD/MM/YYYY' || displayFormat === 'DD/MM/YYYY') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return super.format(date, displayFormat);
  }

  override isValid(date: Date): boolean {
    return !isNaN(date.getTime());
  }
}