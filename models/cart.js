const Sequelize = require('sequelize')
const sequelize = require('../database.js')

const DataTypes = Sequelize.DataTypes

class Cart extends Sequelize.Model { }

Cart.init({
  uid: {
    type: DataTypes.STRING,
    allowNull: false
  },
  books: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  sequelize,
  createdAt: false,
  timestamps: false,
  modelName: 'cart'
})

module.exports = Cart