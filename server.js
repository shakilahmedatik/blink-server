import express from 'express'
import cors from 'cors'
import { readdirSync } from 'fs'
import mongoose from 'mongoose'
import csrf from 'csurf'
import cookieParser from 'cookie-parser'
const morgan = require('morgan')
require('dotenv').config()
const csrfProtection = csrf({ cookie: true })

// create express app
const app = express()

// db
mongoose
  .connect(process.env.DATABASE, {
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true,
    writeConcern: {
      j: true,
    },
  })
  .then(() => console.log('**DB CONNECTED**'))
  .catch(err => console.log('DB CONNECTION ERR => ', err))

// Middlewares
const corsConfig = {
  origin: true,
  credentials: true,
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))
app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())
app.use(morgan('dev'))

// route
readdirSync('./routes').map(r => app.use('/api', require(`./routes/${r}`)))

// csrf
app.use(csrfProtection)
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

// port
const port = process.env.PORT || 8000

app.listen(port, () => console.log(`Server is running on port ${port}`))
