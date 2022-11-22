import { test, expect } from '@playwright/test';

// test.use({ viewport: { width: 500, height: 500 } });

test.describe( 'SMT:Panasonic', () => {
  test( 'Go to Panasonic Mounter Assistant', async ( { page } ) => {
    await page.goto('/')
    const panasonicMounterAssistantAnchor = page.getByRole('link', { name: '富士打件機\n上料助手' })
    await panasonicMounterAssistantAnchor.click()
    // await expect( component ).toContainText( 'Vite + Vue' );
  } );
} )
