import { Page, type TestInfo } from '@playwright/test'

const HEADED_VISUAL_STEP_DELAY_MS = 450

export function shouldUseVisualStepDelay(testInfo: TestInfo): boolean {
    const title = testInfo.title.toLowerCase()
    const isTargetTest =
        title.includes('unload') || title.includes('換料') || title.includes('error')
    return testInfo.project.use.headless === false && isTargetTest
}

export async function waitVisualStepIfNeeded(page: Page, testInfo: TestInfo): Promise<void> {
    if (!shouldUseVisualStepDelay(testInfo)) return
    await page.waitForTimeout(HEADED_VISUAL_STEP_DELAY_MS)
}

export async function waitForSlotFocus(
    page: Page,
    materialInput: ReturnType<Page['locator']>
): Promise<void> {
    await page.waitForFunction(
        (matInputEl) => {
            const active = document.activeElement as HTMLInputElement | null
            return !!active && active.tagName === 'INPUT' && active !== matInputEl
        },
        await materialInput.elementHandle(),
        { timeout: 10000 }
    )
}
