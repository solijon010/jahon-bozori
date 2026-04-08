/**
 * Telegram Bot orqali shartnoma PDF yuborish
 *
 * Sozlash:
 * 1. @BotFather dan yangi bot yaratib TOKEN oling
 * 2. Guruhga yoki kanalga botni qo'shing
 * 3. Chat ID: https://api.telegram.org/bot<TOKEN>/getUpdates
 */

async function sendToTelegram(pdfBuffer, filename, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan')
    return
  }

  const url = `https://api.telegram.org/bot${token}/sendDocument`

  // FormData yaratish (fetch API orqali)
  const { FormData, Blob } = await import('node:buffer').catch(() => {
    // Node 18+ da global mavjud
    return { FormData: global.FormData, Blob: global.Blob }
  })

  // Node.js 18+ built-in FormData
  const form = new (globalThis.FormData || (await importFormData()))()

  const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
  form.append('chat_id', String(chatId))
  form.append('document', blob, filename)
  form.append('caption', caption)
  form.append('parse_mode', 'Markdown')

  const res = await fetch(url, { method: 'POST', body: form })
  const data = await res.json()

  if (!data.ok) {
    console.error('Telegram xatolik:', data.description)
    throw new Error(`Telegram: ${data.description}`)
  }

  console.log(`✅ Telegram'ga yuborildi: ${filename}`)
}

async function importFormData() {
  try {
    const { FormData } = await import('formdata-node')
    return FormData
  } catch {
    return global.FormData
  }
}

module.exports = { sendToTelegram }
