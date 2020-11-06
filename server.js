const express = require('express')
const cors = require('cors')
const server = express()
const sequelize = require('./database.js')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const sessionStore = new SequelizeStore({ db: sequelize })
const port = 8000

const Books = require('./models/books.js')

sessionStore.sync()

Books.sync({ alter: true })

server.use(cors())

server.use(session({
  secret: 'oijgyuytguhi',
  resave: false,
  saveUninitialized: true,
  name: 'bookshop',
  cookie: {
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000
  },
  store: sessionStore
}))


server.get('/test', (req, res) => {
  res.json({ title: 'API для книг', uid: req.sessionID })
})


server.listen(port, (err) => {
  if (err) throw err
  console.log('> Ready on http://localhost:' + port)
})