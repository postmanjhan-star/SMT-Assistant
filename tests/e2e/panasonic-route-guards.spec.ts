import { test, expect } from "@playwright/test"

test("panasonic detail route guard redirects invalid query to 404", async ({ page }) => {
  await page.goto(
    "http://localhost/smt/panasonic-mounter/A1-NPM-W2/WO1?machine_side=1&work_sheet_side=TOP"
  )

  await page.waitForURL(/\/http-status\/404$/)
  await expect(page).toHaveURL(/\/http-status\/404$/)
})

test("panasonic production route guard redirects invalid uuid to 404", async ({ page }) => {
  await page.goto("http://localhost/smt/panasonic-mounter-production/%20")

  await page.waitForURL(/\/http-status\/404$/)
  await expect(page).toHaveURL(/\/http-status\/404$/)
})
