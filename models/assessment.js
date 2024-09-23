'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Assessment extends Model {
    static associate(models) {
      Assessment.belongsTo(models.Student, { foreignKey: 'studentId' });
      Assessment.belongsTo(models.User, { as: 'Teacher', foreignKey: 'teacherId' });
      Assessment.hasMany(models.SubjectAssessment, { foreignKey: 'assessmentId' });
    }
  }
  Assessment.init({
    studentId: DataTypes.INTEGER,
    teacherId: DataTypes.INTEGER,
    date: DataTypes.DATE,
    weekNumber: DataTypes.INTEGER,
    summary: DataTypes.TEXT,
    status: DataTypes.ENUM('pending', 'approved', 'changes-requested'),
    headteacherComment: DataTypes.TEXT,
    assessmentFile: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Assessment',
  });
  return Assessment;
};