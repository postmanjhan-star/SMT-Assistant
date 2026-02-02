import { readonly, ref } from 'vue'

export function useDateFormatter() {

    /**
     * Formats a date string into a localized string (YYYY/MM/DD HH:mm:ss).
     * Handles null or undefined values gracefully.
     * @param dateString The date string to format (e.g., from an API response).
     * @returns The formatted date string or an empty string.
     */
    function format(dateString: string | Date | null | undefined): string {
        if (!dateString) {
            return '';
        }

        let date: Date;

        if (dateString instanceof Date) {
            // If it's already a Date object (likely from frontend new Date()), use it directly.
            // toLocaleString will correctly convert it to Taipei time.
            date = dateString;
        } else {
            // For any string input (from backend or toISOString), we enforce a consistent rule:
            // Treat the "face value" of the time as UTC, regardless of any timezone info in the string.
            // This effectively "adds 8 hours" when displayed in Taipei time, which matches the requirement.

            // 1. Strip any existing timezone ('Z', '+08:00') and milliseconds.
            const dateWithoutTz = dateString.split('.')[0].replace(/Z|[+-]\d{2}(:?\d{2})?$/, '');
            // 2. Normalize to ISO format (YYYY-MM-DDTHH:mm:ss) and append 'Z' to specify it as UTC.
            const isoString = dateWithoutTz.replace(/\//g, '-').replace(' ', 'T') + 'Z';
            date = new Date(isoString);

            // Fallback for any format that fails the above manipulation (e.g., completely unexpected format).
            if (isNaN(date.getTime())) {
                date = new Date(dateString); // Try default parsing as a last resort.
            }
        }

        if (isNaN(date.getTime())) return String(dateString); // Final check to avoid showing "Invalid Date"

        return date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
    }

    return { format }
}