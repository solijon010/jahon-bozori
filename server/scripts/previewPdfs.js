const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

;(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })

  const files = ['bron-reference', 'A-1', 'A-2', 'B-1', 'B-2', 'C-1', 'C-2']
  for (const f of files) {
    const pdfPath = path.join(__dirname, '..', 'assets', 'floors', f + '.pdf')
    const pngPath = path.join(__dirname, '..', 'assets', 'floors', f + '-preview.png')
    const fileUrl = 'file:///' + pdfPath.split('\\').join('/')
    try {
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 20000 })
      await new Promise(r => setTimeout(r, 2000))
      await page.screenshot({ path: pngPath, fullPage: false })
      console.log('OK:', f, '->', fs.statSync(pngPath).size, 'bytes')
    } catch (e) {
      console.log('ERR:', f, e.message)
    }
  }
  await browser.close()
  console.log('Done')
})()
