const bcrypt = require('bcrypt')
const Sequelize = require('sequelize')

const sequelize = require('../database.js')

const DataTypes = Sequelize.DataTypes

class User extends Sequelize.Model {
  async isPasswordValid(password) {
    return await bcrypt.compare(password, this.password)
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
}, {
  sequelize,
  modelName: 'user',
  timestamps: false,
  hooks: {
    beforeCreate: async user => {
      const saltRounds = 10
      const salt = await bcrypt.genSalt(saltRounds)
      user.password = await bcrypt.hash(user.password, salt)
    }
  }
})

module.exports = User