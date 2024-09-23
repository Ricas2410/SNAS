'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subject extends Model {
    static associate(models) {
      Subject.belongsToMany(models.Class, { through: 'ClassSubjects' });
    }
  }
  
  Subject.init({
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Subject',
  });
  
  return Subject;
};