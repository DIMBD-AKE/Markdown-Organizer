// Non-interactive test: launches the app, opens a markdown file with mermaid
// and code blocks, scrolls, then takes screenshots to verify rendering.
import { _electron as electron } from 'playwright-core'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(__dirname, '..')
const SHOT_DIR = '/tmp/shots'
fs.mkdirSync(SHOT_DIR, { recursive: true })

const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('launching...')
  const app = await electron.launch({
    executablePath: electronBin,
    args: [APP_DIR],
    timeout: 30_000,
  })

  await sleep(4000)

  const page = app.windows().find(w => !w.url().startsWith('devtools://'))
           ?? await app.firstWindow()

  console.log('page url:', page.url())
  await page.screenshot({ path: `${SHOT_DIR}/01-initial.png` })
  console.log('screenshot: 01-initial')

  // Check if there's content in the viewer
  const hasContent = await page.evaluate(() => {
    const article = document.querySelector('article.prose')
    return { exists: !!article, text: article?.innerText?.slice(0, 100) }
  })
  console.log('viewer content:', JSON.stringify(hasContent))

  // Count SVGs (mermaid diagrams)
  const diagrams = await page.evaluate(() => ({
    svgs: document.querySelectorAll('article svg').length,
    codeblocks: document.querySelectorAll('article .not-prose').length,
    mermaidLoading: document.querySelectorAll('article .not-prose .text-overlay0').length,
  }))
  console.log('diagrams before scroll:', JSON.stringify(diagrams))

  // Scroll the viewer
  const scrollArea = 'div.overflow-y-auto.bg-base'
  await page.evaluate(s => {
    const el = document.querySelector(s)
    if (el) el.scrollTop += 400
  }, scrollArea)
  await sleep(1000)

  const diagramsAfterScroll = await page.evaluate(() => ({
    svgs: document.querySelectorAll('article svg').length,
    codeblocks: document.querySelectorAll('article .not-prose').length,
    mermaidLoading: document.querySelectorAll('article .not-prose .text-overlay0').length,
  }))
  console.log('diagrams after scroll:', JSON.stringify(diagramsAfterScroll))

  await page.screenshot({ path: `${SHOT_DIR}/02-after-scroll.png` })
  console.log('screenshot: 02-after-scroll')

  // Check CodeBlock collapse state after scroll
  const collapseBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    return btns.filter(b => b.textContent?.includes('펼치기') || b.textContent?.includes('접기'))
               .map(b => b.textContent?.trim())
  })
  console.log('collapse buttons after scroll:', JSON.stringify(collapseBtn))

  await app.close()
  console.log('DONE')
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1) })
