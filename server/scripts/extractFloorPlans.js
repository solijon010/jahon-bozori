/**
 * Extract clean floor plan images from PDFs (no browser chrome)
 * Run once: node scripts/extractFloorPlans.js
 */
const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

const FLOORS_DIR = path.join(__dirname, '..', 'assets', 'floors')

async function extractClean(browser, pdfName) {
  const pdfPath = path.join(FLOORS_DIR, pdfName + '.pdf')
  const outPath = path.join(FLOORS_DIR, pdfName + '.png')
  const fileUrl = 'file:///' + pdfPath.split('\\').join('/')

  const page = await browser.newPage()
  // Large viewport so PDF renders at good resolution
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 })

  try {
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 25000 })
    await new Promise(r => setTimeout(r, 2500))

    // Try to find the PDF page element and screenshot just that
    let screenshotBuffer = null

    // Chrome PDF viewer uses shadow DOM — try to get the embed bounds
    const embedEl = await page.$('embed[type="application/pdf"]')
    if (embedEl) {
      const box = await embedEl.boundingBox()
      if (box && box.width > 100 && box.height > 100) {
        screenshotBuffer = await page.screenshot({
          clip: { x: box.x, y: box.y, width: box.width, height: box.height },
        })
        console.log('  embed clip:', Math.round(box.width), 'x', Math.round(box.height))
      }
    }

    // Fallback: try plugin element
    if (!screenshotBuffer) {
      const pluginEl = await page.$('plugin')
      if (pluginEl) {
        const box = await pluginEl.boundingBox()
        if (box && box.width > 100) {
          screenshotBuffer = await page.screenshot({
            clip: { x: box.x, y: box.y, width: box.width, height: box.height },
          })
          console.log('  plugin clip:', Math.round(box.width), 'x', Math.round(box.height))
        }
      }
    }

    // Fallback: crop out browser chrome manually
    // Chrome PDF viewer: sidebar ~300px, toolbar ~40px
    if (!screenshotBuffer) {
      screenshotBuffer = await page.screenshot({
        clip: { x: 300, y: 40, width: 1300, height: 1160 },
      })
      console.log('  manual clip: 1300x1160')
    }

    fs.writeFileSync(outPath, screenshotBuffer)
    const size = fs.statSync(outPath).size
    console.log('OK', pdfName, '->', Math.round(size/1024) + 'KB')
    return true
  } catch (e) {
    console.log('ERR', pdfName, e.message.slice(0, 80))
    return false
  } finally {
    await page.close()
  }
}

;(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
    ],
  })

  const pdfs = ['A-1', 'A-2', 'B-1', 'B-2', 'C-1', 'C-2', 'bron-reference']
  for (const name of pdfs) {
    if (!fs.existsSync(path.join(FLOORS_DIR, name + '.pdf'))) {
      console.log('SKIP (no pdf):', name)
      continue
    }
    await extractClean(browser, name)
  }

  await browser.close()
  console.log('\nDone. Files in', FLOORS_DIR, ':')
  fs.readdirSync(FLOORS_DIR)
    .filter(f => f.endsWith('.png'))
    .forEach(f => {
      const size = fs.statSync(path.join(FLOORS_DIR, f)).size
      console.log('  ', f, Math.round(size/1024) + 'KB')
    })
})()
