'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubjectAssessment extends Model {
    static associate(models) {
      SubjectAssessment.belongsTo(models.Assessment, { foreignKey: 'assessmentId' });
      SubjectAssessment.belongsTo(models.Subject, { foreignKey: 'subjectId' });
    }
  }
  SubjectAssessment.init({
    assessmentId: DataTypes.INTEGER,
    subjectId: DataTypes.INTEGER,
    comment: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'SubjectAssessment',
  });
  return SubjectAssessment;
};