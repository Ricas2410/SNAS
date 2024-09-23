'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Student extends Model {
    static associate(models) {
      Student.belongsTo(models.Class, { foreignKey: 'ClassId' });
      Student.hasMany(models.Assessment, { foreignKey: 'studentId' });
    }
  }
  
  Student.init({
    name: DataTypes.STRING,
    ClassId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Student',
  });
  
  return Student;
};