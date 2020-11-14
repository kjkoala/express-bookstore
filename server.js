const express = require('express')
const cors = require('cors')
const server = express()
const bodyParser = require('body-parser')
const sequelize = require('./database.js')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const sessionStore = new SequelizeStore({ db: sequelize })
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const Op = require('sequelize').Op
const port = 8000

const Books = require('./models/books.js')
const Cart = require('./models/cart.js')
const User = require('./models/user.js')

sessionStore.sync()

Books.sync({ alter: true })
Cart.sync({ alter: true })
User.sync({ alter: true })

server.use(cors())
server.use(bodyParser.json())

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
},
  async (email, password, done) => {
    if (!email || !password) {
      done('Email и пароль обязательны', null)
      return
    }
    const user = await User.findOne({
      where: {
        email
      }
    })

    if (!user) {
      done('Пользователь не найден', null)
      return
    }

    const valid = await user.isPasswordValid(password)
    if (!valid) {
      done('Email или пароль не совпадают', null)
      return
    }
    done(null, user)
  }
))

passport.serializeUser((user, done) => {
  done(null, user.email)
})

passport.deserializeUser((email, done) => {
  User.findOne({
    where: {
      email
    }
  })
    .then(user => done(null, user))
})

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
}),
  passport.initialize(),
  passport.session()
)

server.get('/api/books', (req, res) => {
  let { limit, offset, filter, sort } = req.query
  const finders = {}
  if (!limit) {
    finders.limit = 10
  } else {
    finders.limit = parseInt(limit)
  }
  if (!offset) {
    finders.offset = 0
  } else {
    finders.offset = parseInt(offset)
  }
  if (filter && sort) {
    finders.order = [[filter, sort]]
  }
  Books.findAndCountAll(finders)
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
    .catch(err => {
      res.json({
        status: false,
        message: err
      })
    })
})

server.delete('/api/books/:id', (req, res) => {
  const { id } = req.params
  Books.destroy({
    where: {
      id
    }
  })
    .then(result => {
      res.json({
        status: result ? true : false,
        message: result ? 'Книга удалена' : 'Книга не найдена'
      })
    })
    .catch(err => {
      res.json({
        status: false,
        message: err
      })
    })
})

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

server.put('/api/books/:id', (req, res) => {
  const { id } = req.params
  const { title, picture, author, price } = req.body
  if (!title || !picture || !author || !price) {
    res.json({
      status: false,
      message: 'Заполните все поля'
    })
    return
  }
  Books.update({
    title,
    picture,
    author,
    price
  }, {
    where: {
      id
    }
  })
    .then(() => {
      res.json({
        status: true,
        message: 'Книга обновлена'
      })
    })
    .catch(e => {
      res.json({
        status: false,
        message: e
      })
    })
})

server.get('/api/cart', (req, res) => {
  const { sessionID } = req
  const userEmail = req.session.passport && req.session.passport.user
  Cart.findAndCountAll({
    where: {
      uid: userEmail || sessionID
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
    if(!bookId || !count || typeof count === 'string') {
      res.status(500).json({
        status: false,
        message: 'Ошибка при передаче запроса'
      })
      return
    }
    const { sessionID } = req
    const userEmail = req.session.passport && req.session.passport.user
    const [cartUser, created] = await Cart.findOrCreate({
      where: {
        uid: userEmail || sessionID
      },
      defaults: {
        uid: userEmail || sessionID,
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
          uid: userEmail
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

server.delete('/api/cart', async (req, res) => {
  try {
    const { bookId, count } = req.body
    const { sessionID } = req
    const userEmail = req.session.passport && req.session.passport.user
    const cart = await Cart.findOne({
      where: {
        uid: userEmail || sessionID
      }
    })
    const books = JSON.parse(cart.books)
    if (bookId in books) {
      books[bookId] -= count
      if (books[bookId] <= 0) {
        delete books[bookId]
      }
      if (Object.values(books).length) {
        await Cart.update({
          books
        }, {
          where: {
            uid: userEmail || sessionID
          }
        })

        res.json({
          status: true,
          message: 'ok'
        })
        return
      } else {
        await Cart.destroy({
          where: {
            uid: userEmail || sessionID
          }
        })

        res.json({
          status: true,
          message: 'ok'
        })
        return
      }
    }
    res.status(400).end()
  } catch (e) {
    console.log(e)
    res.status(500).end()
  }
})

server.post('/api/auth/register', async (req, res) => {
  try {
    const { password, email, passwordConfirm } = req.body
    if (!password || !email || !passwordConfirm) {
      res.json({
        status: false,
        message: 'Необходимо заполнить все поля'
      })
      return
    }
    if (password !== passwordConfirm) {
      res.json({
        status: false,
        message: 'Пароли должны совпадать'
      })
      return
    }
    const [user, created] = await User.findOrCreate({
      where: {
        email
      },
      defaults: {
        email,
        password
      }
    })
    if (created) {
      req.login(user, (err) => {
        if (err) {
          res.status(500).json({
            status: false,
            message: 'Ошибка при авторизации'
          })
          return
        }
        res.json({
          status: true,
          message: 'Вы авторизовались'
        })
        return
      })
    } else {
      res.json({
        status: false,
        message: 'Такой email уже существует'
      })
    }

  } catch (e) {
    res.status(500).json({
      status: false,
      message: e
    })
  }
})

server.post('/api/auth/login', (req, res) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      res.status(500).json({
        status: false,
        message: err
      })
      return
    }
    if (!user) {
      res.status(500).json({
        status: false,
        message: 'Пользователь не найден'
      })
      return
    }
    req.login(user, (err) => {
      if (err) {
        res.status(500).json({
          status: false,
          message: err
        })
        return
      }
      res.json({
        status: true,
        message: 'Вы авторизовались'
      })
    })
  })(req, res)
})


server.post('/api/auth/logout', (req, res) => {
  req.logOut()
  req.session.destroy()

  res.json({
    status: true,
    message: 'Вы вышли из профиля'
  })
})

server.listen(port, (err) => {
  if (err) throw err
  console.log('> Ready on http://localhost:' + port)
})