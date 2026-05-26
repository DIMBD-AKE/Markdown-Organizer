// tests/e2e/app.test.ts
import { test, expect, _electron as electron } from '@playwright/test'
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers'

test.describe('Markdown Organizer E2E', () => {
  test('app launches and shows empty state', async () => {
    const latestBuild = findLatestBuild('out')
    const appInfo = parseElectronApp(latestBuild)

    const app = await electron.launch({
      args: [appInfo.main],
      executablePath: appInfo.executable
    })

    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // When no project selected, viewer shows placeholder
    await expect(page.locator('text=파일을 선택하세요')).toBeVisible()

    await app.close()
  })
})
