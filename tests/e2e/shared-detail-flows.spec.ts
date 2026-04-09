import { test, expect, Page } from '@playwright/test';
import { setupAuthToken, setupExpiredAuthToken, setupFutureExpiryAuthToken } from './helpers/auth';
import { mockSwitchUserApi, type SwitchEmployee } from './helpers/scanLogin';
import { DetailPage, MACHINE_URLS, type Machine } from './pages/DetailPage';

type MachineConfig = {
    machine: Machine
    detailUrl: string
    employee: SwitchEmployee
    loginCredential: string
    productionUrl: (uuid: string) => string
    statsApiRoute: (uuid: string) => string
    statsLogsApiRoute: (uuid: string) => string
    productionMaterialInput: (page: Page) => ReturnType<Page['getByTestId']>
}

const MACHINES: MachineConfig[] = [
    {
        machine: 'fuji',
        detailUrl: MACHINE_URLS.fuji.normal,
        employee: { idno: '1001', full_name: 'Switched User' },
        loginCredential: '1001:mysignature',
        productionUrl: (uuid) => `http://localhost/smt/fuji-mounter-production/${uuid}`,
        statsApiRoute: (uuid) => `**/smt/fuji_mounter_item/stats/${uuid}`,
        statsLogsApiRoute: (uuid) => `**/smt/fuji_mounter_item/stats/logs/${uuid}`,
        productionMaterialInput: (page) => page.getByTestId('fuji-production-material-input').locator('input'),
    },
    {
        machine: 'panasonic',
        detailUrl: MACHINE_URLS.panasonic.normal,
        employee: { idno: '2001', full_name: 'Switched PanUser' },
        loginCredential: '2001:mysignature',
        productionUrl: (uuid) => `http://localhost/smt/panasonic-mounter-production/${uuid}`,
        statsApiRoute: (uuid) => `**/smt/panasonic_mounter_item/stats/${uuid}`,
        statsLogsApiRoute: (uuid) => `**/smt/panasonic_mounter_item/stats/logs/${uuid}`,
        productionMaterialInput: (page) => page.getByTestId('panasonic-main-material-input').locator('input'),
    },
]

function mockActiveProductionStats(page: Page, cfg: MachineConfig, uuid: string) {
    return page.route(cfg.statsApiRoute(uuid), (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
                id: 1, uuid,
                created_at: '2026-01-01T00:00:00', updated_at: null,
                production_start: '2026-01-01T00:00:00', production_end: null,
                work_order_no: 'WO-TEST', product_idno: 'PROD-TEST',
                machine_idno: 'MACH-TEST', machine_side: null, board_side: null,
                slot_idno: 'SLOT-TEST', sub_slot_idno: null,
                material_idno: null, produce_mode: null, feed_records: [],
            }]),
        })
    );
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupAuthToken(page);
});

for (const cfg of MACHINES) {
    const m = cfg.machine;

    // ─── Detail page auth tests ────────────────────────────────────────────────

    test(`[${m}] scan login: shows modal when not authenticated on detail page load`, async ({ page }) => {
        await page.addInitScript(() => localStorage.removeItem('authorized'));
        await mockSwitchUserApi(page, 200, cfg.employee);
        await page.goto(cfg.detailUrl);

        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
        const loginInput = page.getByTestId('scan-login-input').locator('input');
        await loginInput.fill(cfg.loginCredential);
        await loginInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    });

    test(`[${m}] scan login: shows modal when employee info missing from existing session on detail page`, async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('authorized', JSON.stringify({
                OAuth2PasswordBearer: {
                    schema: { flow: 'password', tokenUrl: '', scopes: {}, type: 'oauth2' },
                    token: { access_token: 'old-token', token_type: 'bearer' },
                    username: 'operator',
                },
                HTTPBasic: null,
            }));
        });
        await mockSwitchUserApi(page, 200, cfg.employee);
        await page.goto(cfg.detailUrl);

        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
        const loginInput = page.getByTestId('scan-login-input').locator('input');
        await loginInput.fill(cfg.loginCredential);
        await loginInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    });

    test(`[${m}] scan login: S1111 opens login modal on detail page`, async ({ page }) => {
        const detail = new DetailPage(page, m);
        await page.goto(cfg.detailUrl);
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
        await detail.materialInput.fill('S1111');
        await detail.materialInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
    });

    test(`[${m}] scan login: S1111 success switches user on detail page`, async ({ page }) => {
        const detail = new DetailPage(page, m);
        await mockSwitchUserApi(page, 200, cfg.employee);
        await page.goto(cfg.detailUrl);
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
        await detail.materialInput.fill('S1111');
        await detail.materialInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
        const loginInput = page.getByTestId('scan-login-input').locator('input');
        await loginInput.fill(cfg.loginCredential);
        await loginInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
        await expect(page.getByTestId('operator-name-tag')).toContainText(cfg.employee.full_name);
        await expect(page.getByTestId('operator-idno-tag')).toContainText(cfg.employee.idno);
    });

    test(`[${m}] scan login: S1111 failure shows error on detail page`, async ({ page }) => {
        const detail = new DetailPage(page, m);
        await mockSwitchUserApi(page, 401, cfg.employee);
        await page.goto(cfg.detailUrl);
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
        await detail.materialInput.fill('S1111');
        await detail.materialInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
        const loginInput = page.getByTestId('scan-login-input').locator('input');
        await loginInput.fill(`${cfg.employee.idno}:wrongsignature`);
        await loginInput.press('Enter');
        await expect(page.getByTestId('scan-login-error')).toBeVisible();
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
    });

    // ─── Token expiry tests ────────────────────────────────────────────────────

    test(`[${m}] scan login: shows modal when token is expired on detail page load`, async ({ page }) => {
        await setupExpiredAuthToken(page);
        await mockSwitchUserApi(page, 200, cfg.employee);
        await page.goto(cfg.detailUrl);
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
        const loginInput = page.getByTestId('scan-login-input').locator('input');
        await loginInput.fill(cfg.loginCredential);
        await loginInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    });

    test(`[${m}] scan login: does not show modal when token has future expiry on detail page load`, async ({ page }) => {
        await setupFutureExpiryAuthToken(page);
        await page.goto(cfg.detailUrl);
        await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    });

    // ─── Production page auth tests ────────────────────────────────────────────

    test(`[${m}] scan login: shows modal when not authenticated on production page load`, async ({ page }) => {
        const productionUuid = `scan-login-${m}-prod`;
        await page.addInitScript(() => localStorage.removeItem('authorized'));
        await page.route(cfg.statsApiRoute(productionUuid), (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        );
        await page.route(cfg.statsLogsApiRoute(productionUuid), (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        );
        await mockSwitchUserApi(page, 200, cfg.employee);
        await page.goto(cfg.productionUrl(productionUuid));
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
        const loginInput = page.getByTestId('scan-login-input').locator('input');
        await loginInput.fill(cfg.loginCredential);
        await loginInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    });

    test(`[${m}] scan login: S1111 opens login modal on production page`, async ({ page }) => {
        const productionUuid = `scan-login-${m}-prod-s1111`;
        await mockActiveProductionStats(page, cfg, productionUuid);
        await page.route(cfg.statsLogsApiRoute(productionUuid), (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        );
        await page.goto(cfg.productionUrl(productionUuid));
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
        const materialInput = cfg.productionMaterialInput(page);
        await materialInput.fill('S1111');
        await materialInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
    });

    test(`[${m}] scan login: S1111 success switches user on production page`, async ({ page }) => {
        const productionUuid = `scan-login-${m}-prod-success`;
        await mockActiveProductionStats(page, cfg, productionUuid);
        await page.route(cfg.statsLogsApiRoute(productionUuid), (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        );
        await mockSwitchUserApi(page, 200, cfg.employee);
        await page.goto(cfg.productionUrl(productionUuid));
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
        const materialInput = cfg.productionMaterialInput(page);
        await materialInput.fill('S1111');
        await materialInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
        const loginInput = page.getByTestId('scan-login-input').locator('input');
        await loginInput.fill(cfg.loginCredential);
        await loginInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
        await expect(page.getByTestId('operator-name-tag')).toContainText(cfg.employee.full_name);
        await expect(page.getByTestId('operator-idno-tag')).toContainText(cfg.employee.idno);
    });

    test(`[${m}] scan login: S1111 failure shows error on production page`, async ({ page }) => {
        const productionUuid = `scan-login-${m}-prod-fail`;
        await mockActiveProductionStats(page, cfg, productionUuid);
        await page.route(cfg.statsLogsApiRoute(productionUuid), (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        );
        await mockSwitchUserApi(page, 401, cfg.employee);
        await page.goto(cfg.productionUrl(productionUuid));
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();
        const materialInput = cfg.productionMaterialInput(page);
        await materialInput.fill('S1111');
        await materialInput.press('Enter');
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
        const loginInput = page.getByTestId('scan-login-input').locator('input');
        await loginInput.fill(`${cfg.employee.idno}:wrongsignature`);
        await loginInput.press('Enter');
        await expect(page.getByTestId('scan-login-error')).toBeVisible();
        await expect(page.getByTestId('scan-login-modal')).toBeVisible();
    });
}
