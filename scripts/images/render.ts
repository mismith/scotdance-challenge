// draws public/share.png (link previews) and the Home Screen PNG icons from the app's own pieces
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' })
await server.listen()
const browser = await chromium.launch()
const page = await browser.newPage()

await page.setViewportSize({ width: 1200, height: 630 })
await page.goto('http://localhost:5199/scripts/images/share.html')
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: 'public/share.png' })

for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<body style="margin:0"><img src="http://localhost:5199/icon.svg" width="${size}" height="${size}"></body>`,
  )
  await page.locator('img').evaluate((img: HTMLImageElement) => img.decode())
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true })
}

await browser.close()
await server.close()
