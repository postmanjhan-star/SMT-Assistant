import { Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export type ScanRecord = { material: string; slot: string };

export function readCsvRecords(relativePath: string): ScanRecord[] {
    const csvPath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(csvPath)) {
        console.warn(`CSV file not found at ${csvPath}, returning empty list.`);
        return [];
    }
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const records: ScanRecord[] = [];
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 2 && parts[0].trim()) {
            records.push({ material: parts[0].trim(), slot: parts[1].trim() });
        }
    }
    return records;
}

export async function expectLatestMessage(
    page: Page,
    testId: 'error-message' | 'warning-message' | 'info-message' | 'success-message',
    text: string | RegExp
): Promise<void> {
    const message = page.getByTestId(testId).last();
    await expect(message).toBeVisible();
    await expect(message).toContainText(text);
}
