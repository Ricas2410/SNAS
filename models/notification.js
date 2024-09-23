'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, { foreignKey: 'userId' });
      Notification.belongsTo(models.Assessment, { foreignKey: 'assessmentId' });
    }
  }
  Notification.init({
    userId: DataTypes.INTEGER,
    message: DataTypes.STRING,
    read: DataTypes.BOOLEAN,
    type: DataTypes.STRING,
    assessmentId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Notification',
  });
  return Notification;
};
