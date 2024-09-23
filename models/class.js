'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Class extends Model {
    static associate(models) {
      Class.belongsTo(models.User, { as: 'Teacher', foreignKey: 'teacherId' });
      Class.hasMany(models.Student, { foreignKey: 'ClassId' });
      Class.belongsToMany(models.Subject, { through: 'ClassSubjects' });
    }
  }
  
  Class.init({
    name: DataTypes.STRING,
    teacherId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Class',
  });
  
  return Class;
};