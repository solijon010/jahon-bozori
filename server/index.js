require('dotenv').config()
const express = require('express')
const cors = require('cors')
const contractRouter = require('./routes/contract')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    /\.vercel\.app$/,
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  methods: ['GET', 'POST'],
}))

// Base64 image uchun limit oshiriladi
app.use(express.json({ limit: '50mb' }))

app.use('/api/contract', contractRouter)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`)
  console.log(`📋 Contract API: http://localhost:${PORT}/api/contract/generate\n`)
})
