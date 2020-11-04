const Sequelize = require('sequelize')
const sequelize = require('../database.js')

const DataTypes = Sequelize.DataTypes

class Books extends Sequelize.Model { }

Books.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  picture: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  author: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.INTEGER, allowNull: false }
}, {
  sequelize,
  modelName: 'books'
})

module.exports = Books