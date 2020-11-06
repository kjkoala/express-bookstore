const express = require('express')
const cors = require('cors')
const fs = require('fs')
const server = express()
const bodyParser = require('body-parser')
const sequelize = require('./database.js')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const sessionStore = new SequelizeStore({ db: sequelize })
const port = 8000

const Books = require('./models/books.js')

sessionStore.sync()

Books.sync({ alter: true })

server.use(cors())
server.use(bodyParser.json())

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

server.get('/api/books', (req, res) => {
  Books.findAndCountAll()
    .then(result => {
      const books = result.rows.map(book => book.dataValues)
      res.json({
        status: true,
        data: {
          count: result.count,
          books
        }
      })
    })
})

// server.delete('/api/books', (res, res) => {

// })

server.post('/api/books', (req, res) => {
  const { title, picture, author, price } = req.body
  if (!title || !picture || !author || !price) {
    res.json({
      status: false,
      message: 'Заполните все поля'
    })
    return
  }
  Books.create({
    title,
    picture,
    author,
    price
  })
    .then(() => {
      res.json({
        status: true,
        message: 'Книга добавлена'
      })
    })
    .catch(err => {
      res.json({
        status: false,
        error: {
          name: err.name,
          message: err.parent.sqlMessage
        }
      })
    })
})


server.listen(port, (err) => {
  if (err) throw err
  console.log('> Ready on http://localhost:' + port)
})