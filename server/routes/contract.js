const express = require('express')
const router = express.Router()
const { generateContractPdf } = require('../services/pdfGenerator')
const { sendToTelegram } = require('../services/telegram')

router.post('/generate', async (req, res) => {
  try {
    const {
      form,
      apartment,
      blockId,
      bolimNum,
      floor,
      floorImageBase64,
      overlayViewBox,
      selectedPolygonPoints,
      action,
    } = req.body

    if (!form || !apartment || !blockId) {
      return res.status(400).json({ error: "Ma'lumotlar to'liq emas" })
    }

    const contractNum = generateContractNumber()
    const today = formatDate(new Date())

    const pdfBuffer = await generateContractPdf({
      form,
      apartment,
      blockId,
      bolimNum,
      floor,
      floorImageBase64,
      overlayViewBox,
      selectedPolygonPoints,
      action,
      contractNum,
      today,
    })

    const filename = `shartnoma-${contractNum}.pdf`

    // Telegram'ga yuborish
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const caption =
        `📄 *Yangi ${action === 'bron' ? 'Bron' : 'Sotuv'} Shartnomasi*\n` +
        `🏠 Xonadon: ${apartment.address}\n` +
        `👤 Mijoz: ${form.familiya} ${form.ism}\n` +
        `💰 Boshlang'ich: ${form.boshlangich} USD\n` +
        `📅 Muddat: ${form.oylar} oy\n` +
        `📋 Shartnoma №: ${contractNum}`
      await sendToTelegram(pdfBuffer, filename, caption)
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('X-Contract-Number', contractNum)
    res.send(Buffer.from(pdfBuffer))
  } catch (err) {
    console.error('Contract generation error:', err)
    res.status(500).json({ error: err.message || 'Shartnoma yaratishda xatolik' })
  }
})

function generateContractNumber() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `WENY-${y}${m}${d}-${rand}`
}

function formatDate(date) {
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
  ]
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

module.exports = router
