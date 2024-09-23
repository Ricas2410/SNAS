'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);
    await queryInterface.bulkInsert('Users', [
      { username: 'admin', password: hashedPassword, role: 'admin', createdAt: new Date(), updatedAt: new Date() },
      { username: 'teacher1', password: hashedPassword, role: 'teacher', createdAt: new Date(), updatedAt: new Date() },
      { username: 'headteacher1', password: hashedPassword, role: 'headteacher', createdAt: new Date(), updatedAt: new Date() },
    ]);

    // Create classes
    await queryInterface.bulkInsert('Classes', [
      { name: 'Class 1A', teacherId: 2, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Class 1B', teacherId: 2, createdAt: new Date(), updatedAt: new Date() },
    ]);

    // Create subjects
    await queryInterface.bulkInsert('Subjects', [
      { name: 'Math', createdAt: new Date(), updatedAt: new Date() },
      { name: 'English', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Science', createdAt: new Date(), updatedAt: new Date() },
    ]);

    // Create students
    await queryInterface.bulkInsert('Students', [
      { name: 'John Doe', classId: 1, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Jane Smith', classId: 1, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Bob Johnson', classId: 2, createdAt: new Date(), updatedAt: new Date() },
    ]);

    // Create assessments
    await queryInterface.bulkInsert('Assessments', [
      { studentId: 1, teacherId: 2, date: new Date(), weekNumber: 1, summary: 'Good progress', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
      { studentId: 2, teacherId: 2, date: new Date(), weekNumber: 1, summary: 'Needs improvement', status: 'approved', createdAt: new Date(), updatedAt: new Date() },
      { studentId: 3, teacherId: 2, date: new Date(), weekNumber: 1, summary: 'Excellent work', status: 'changes-requested', headteacherComment: 'Please provide more details', createdAt: new Date(), updatedAt: new Date() },
    ]);

    // Create subject assessments
    await queryInterface.bulkInsert('SubjectAssessments', [
      { assessmentId: 1, subjectId: 1, comment: 'Good at algebra', createdAt: new Date(), updatedAt: new Date() },
      { assessmentId: 1, subjectId: 2, comment: 'Improving in grammar', createdAt: new Date(), updatedAt: new Date() },
      { assessmentId: 2, subjectId: 1, comment: 'Struggling with fractions', createdAt: new Date(), updatedAt: new Date() },
      { assessmentId: 2, subjectId: 3, comment: 'Excellent in biology', createdAt: new Date(), updatedAt: new Date() },
      { assessmentId: 3, subjectId: 2, comment: 'Great writing skills', createdAt: new Date(), updatedAt: new Date() },
      { assessmentId: 3, subjectId: 3, comment: 'Needs to improve in chemistry', createdAt: new Date(), updatedAt: new Date() },
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('SubjectAssessments', null, {});
    await queryInterface.bulkDelete('Assessments', null, {});
    await queryInterface.bulkDelete('Students', null, {});
    await queryInterface.bulkDelete('Subjects', null, {});
    await queryInterface.bulkDelete('Classes', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
