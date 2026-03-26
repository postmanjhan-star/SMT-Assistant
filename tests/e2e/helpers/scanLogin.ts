import { Page } from '@playwright/test';

export type SwitchEmployee = { idno: string; full_name: string };

export function mockSwitchUserApi(
    page: Page,
    status = 200,
    employee: SwitchEmployee = { idno: '1001', full_name: 'Switched User' }
): Promise<void> {
    return page.route('**/smt/operator/switch', (route) =>
        status === 200
            ? route.fulfill({
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify({
                      access_token: 'switched-token',
                      token_type: 'bearer',
                      employee,
                  }),
              })
            : route.fulfill({
                  status,
                  contentType: 'application/json',
                  body: JSON.stringify({ detail: 'Unauthorized' }),
              })
    );
}
