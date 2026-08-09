import { expect, test } from '@playwright/test'

test('dashboard renders and primary navigation is usable', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: 'Sova' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page.getByRole('link', { name: /attack lab/i }).click()
  await expect(page.getByRole('heading', { name: /attack lab/i })).toBeVisible()
})

test('attack lab loads an editable example and shows which one is selected', async ({ page }) => {
  await page.goto('/attack-lab')
  const selected = page.getByRole('button', { name: /verified payment/i })
  await expect(selected).toHaveClass(/active/)
  await expect(page.getByLabel('Email / invoice text')).toBeEditable()
  const target = page.getByRole('button', { name: /high-value request/i })
  await target.click()
  await expect(target).toHaveClass(/active/)
  await expect(selected).not.toHaveClass(/active/)
  await expect(page.getByText('SGD 85,000')).toBeVisible()
})

test('hostile email content remains inert text in the inbox', async ({ page }) => {
  await page.route('**/api/demo/emails', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify([{
      id: 'hostile', label: 'Test', scenario: 'REQUIRE_APPROVAL', sender: 'attacker@example.test',
      subject: '<img src=x onerror="window.__xss=1">', visibleBody: '<script>window.__xss=1</script>',
    }]) })
  })
  await page.goto('/inbox')
  await expect(page.getByText('<img src=x onerror="window.__xss=1">')).toBeVisible()
  expect(await page.evaluate(() => (window as { __xss?: number }).__xss)).toBeUndefined()
})
