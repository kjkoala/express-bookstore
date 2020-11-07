const express = require('express')
const cors = require('cors')
const server = express()
const bodyParser = require('body-parser')
const sequelize = require('./database.js')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const sessionStore = new SequelizeStore({ db: sequelize })
const port = 8000

const Books = require('./models/books.js')
const Cart = require('./models/cart.js')

sessionStore.sync()

Books.sync({ alter: true })
Cart.sync({ alter: true })

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
      res.status(201).json({
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

server.get('/api/cart', (req, res) => {
  const { sessionID } = req
  Cart.findAndCountAll({
    where: {
      uid: sessionID
    }
  })
    .then(reslut => {
      const [cart] = reslut.rows.map(data => data.dataValues)
      let isExist = cart && cart.books
      res.json({
        status: true,
        data: {
          count: isExist ? Object.values(JSON.parse(cart.books)).length : 0,
          books: isExist ? cart.books : {}
        }
      })
    })
    .catch(err => {
      console.log(err)
      res.status(500).end()
    })
})

server.put('/api/cart', async (req, res) => {
  try {
    const { bookId, count } = req.body
    const { sessionID } = req

    const [cartUser, created] = await Cart.findOrCreate({
      where: {
        uid: sessionID
      },
      defaults: {
        uid: sessionID,
        books: {
          [bookId]: count
        }
      }
    })

    if (created) {
      res.status(201).end()
      return
    }

    if (cartUser) {
      const books = JSON.parse(cartUser.dataValues.books)
      if (bookId in books) {
        books[bookId] += count
      } else {
        books[bookId] = count
      }
      Cart.update({
        books
      }, {
        where: {
          uid: sessionID
        }
      })
      res.status(202).end()
      return
    }
    res.status(400).end()
  } catch (e) {
    res.status(500).end()
  }
})


server.listen(port, (err) => {
  if (err) throw err
  console.log('> Ready on http://localhost:' + port)
})