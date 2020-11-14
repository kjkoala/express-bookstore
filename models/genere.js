const Sequelize = require('sequelize')
const sequelize = require('../database.js')

const DataTypes = Sequelize.DataTypes

class Genere extends Sequelize.Model { }

Genere.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  count: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false }
}, {
  sequelize,
  modelName: 'genere'
})

module.exports = Genere