'use strict';
const { Model, DataTypes, Sequelize } = require('sequelize'); // Import Sequelize here

module.exports = (sequelize) => {
  class ArchivedUser extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }

  ArchivedUser.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), // Use Sequelize here
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), // Use Sequelize here
    },
  }, {
    sequelize,
    modelName: 'ArchivedUser',
  });

  return ArchivedUser;
};
