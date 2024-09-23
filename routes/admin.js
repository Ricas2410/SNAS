const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User, Class, Student, Subject, Assessment, ArchivedUser, Notification } = require('../models');

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

router.use(isAdmin);

router.get('/dashboard', (req, res) => {
    res.render('pages/admin/dashboard', { title: 'Admin Dashboard', user: req.session.user });
});

// User management routes
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            include: [
                {
                    model: Class,
                    as: 'Classes',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });
        res.render('pages/admin/users', { title: 'User Management', users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching users',
            error: error
        });
    }
});

router.get('/user/add', async (req, res) => {
    try {
        const classes = await Class.findAll();
        res.render('pages/admin/add-user', { title: 'Add User', classes });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).send('An error occurred while fetching classes');
    }
});

router.post('/user/add', async (req, res) => {
    const { username, password, role, classId, fullName } = req.body; // Include fullName
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password: hashedPassword, role, fullName }); // Include fullName
        
        if (role === 'teacher' && classId) {
            await Class.update({ teacherId: user.id }, { where: { id: classId } });
        }
        
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error adding user:', error);
        res.render('pages/admin/add-user', { 
            title: 'Add User', 
            error: 'An error occurred while adding the user. Please try again.',
            formData: { username, role }
        });
    }
});

router.get('/user/edit/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findByPk(userId, {
            include: [{ model: Class, as: 'Classes' }]
        });
        
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }

        const classes = await Class.findAll();
        
        res.render('pages/admin/edit-user', { 
            title: 'Edit User', 
            user, 
            classes,
            roles: ['admin', 'teacher', 'headteacher']
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching the user',
            error: error
        });
    }
});

router.post('/user/edit/:id', async (req, res) => {
    const userId = req.params.id;
    const { username, role, classIds, fullName } = req.body; // Include fullName
    try {
        // Update user details
        await User.update({ username, role, fullName }, { where: { id: userId } });
        
        if (role === 'teacher') {
            // Remove teacher from all classes
            await Class.update({ teacherId: null }, { where: { teacherId: userId } });
            
            // Assign teacher to selected classes
            if (classIds && classIds.length > 0) {
                await Class.update({ teacherId: userId }, { where: { id: classIds } });
            }
        }
        
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('An error occurred while updating the user');
    }
});

router.post('/user/delete/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        // Find the user to archive
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Archive the user
        await ArchivedUser.create({
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            password: user.password, 
        });

        // Delete related notifications
        await Notification.destroy({ where: { userId: userId } });

        // Delete related assessments
        await Assessment.destroy({ where: { teacherId: userId } });

        // Finally, delete the user from the Users table
        await User.destroy({ where: { id: userId } });

        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error archiving user:', error);
        res.status(500).send('An error occurred while archiving the user');
    }
});

router.post('/user/restore/:id', async (req, res) => {
    const archivedUserId = req.params.id;
    try {
        const archivedUser = await ArchivedUser.findByPk(archivedUserId);
        if (!archivedUser) {
            return res.status(404).send('Archived user not found');
        }

        // Restore the user
        await User.create({
            username: archivedUser.username,
            fullName: archivedUser.fullName,
            role: archivedUser.role,
            password: archivedUser.password, // Consider hashing this if you want to keep it secure
        });

        // Delete from archived users
        await ArchivedUser.destroy({ where: { id: archivedUserId } });
        res.redirect('/admin/archived-users');
    } catch (error) {
        console.error('Error restoring user:', error);
        res.status(500).send('An error occurred while restoring the user');
    }
});

// Class management routes
router.get('/classes', async (req, res) => {
    try {
        const classes = await Class.findAll({
            include: [
                { model: User, as: 'Teacher', attributes: ['id', 'username'] },
                { model: Subject }
            ]
        });
        res.render('pages/admin/classes', { title: 'Classes', classes });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching classes',
            error: error
        });
    }
});

router.get('/class/add', async (req, res) => {
    try {
        const subjects = await Subject.findAll();
        res.render('pages/admin/add-class', { title: 'Add Class', subjects });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).send('An error occurred while fetching subjects');
    }
});

router.post('/class/add', async (req, res) => {
    const { name, subjects } = req.body;
    try {
        const newClass = await Class.create({ name });
        if (subjects && subjects.length > 0) {
            await newClass.addSubjects(subjects);
        }
        res.redirect('/admin/classes');
    } catch (error) {
        console.error('Error adding class:', error);
        res.status(500).send('An error occurred while adding the class');
    }
});

router.get('/class/edit/:id', async (req, res) => {
    const classId = req.params.id;
    try {
        const classItem = await Class.findByPk(classId, {
            include: [
                { model: User, as: 'Teacher' },
                { model: Subject }
            ]
        });
        
        if (!classItem) {
            return res.status(404).send('Class not found');
        }

        const teachers = await User.findAll({ where: { role: 'teacher' } });
        const subjects = await Subject.findAll();
        
        res.render('pages/admin/edit-class', { 
            title: 'Edit Class', 
            classItem, 
            teachers, 
            subjects,
            selectedSubjects: classItem.Subjects.map(s => s.id)
        });
    } catch (error) {
        console.error('Error fetching class:', error);
        res.status(500).render('error', {
            message: 'An error occurred while fetching the class',
            error: error
        });
    }
});

router.post('/class/edit/:id', async (req, res) => {
    const classId = req.params.id;
    const { name, teacherId, subjects } = req.body;
    try {
        const classItem = await Class.findByPk(classId);
        if (!classItem) {
            return res.status(404).send('Class not found');
        }
        
        await classItem.update({ name, teacherId });
        await classItem.setSubjects(subjects || []);
        
        res.redirect('/admin/classes');
    } catch (error) {
        console.error('Error updating class:', error);
        res.status(500).render('error', {
            message: 'An error occurred while updating the class',
            error: error
        });
    }
});

router.post('/class/delete/:id', async (req, res) => {
    const classId = req.params.id;
    try {
        await Class.destroy({ where: { id: classId } });
        res.redirect('/admin/classes');
    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).send('An error occurred while deleting the class');
    }
});

// Student management routes
router.get('/students', async (req, res) => {
    try {
        const students = await Student.findAll({
            include: [{ model: Class, attributes: ['id', 'name'] }],
            order: [['name', 'ASC']]
        });
        res.render('pages/admin/students', { title: 'Manage Students', students });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching students' });
    }
});

router.get('/student/add', async (req, res) => {
    try {
        const classes = await Class.findAll();
        res.render('pages/admin/add-student', { title: 'Add Student', classes });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).send('An error occurred while fetching classes');
    }
});

router.post('/student/add', async (req, res) => {
    const { name, ClassId } = req.body;
    try {
        await Student.create({ name, ClassId });
        res.redirect('/admin/students');
    } catch (error) {
        console.error('Error adding student:', error);
        res.status(500).render('error', { message: 'An error occurred while adding the student' });
    }
});

router.get('/student/edit/:id', async (req, res) => {
    const studentId = req.params.id;
    try {
        const student = await Student.findByPk(studentId);
        const classes = await Class.findAll();
        res.render('pages/admin/edit-student', { title: 'Edit Student', student, classes });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching the student' });
    }
});

router.post('/student/edit/:id', async (req, res) => {
    const studentId = req.params.id;
    const { name, ClassId } = req.body;
    try {
        await Student.update({ name, ClassId }, { where: { id: studentId } });
        res.redirect('/admin/students');
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).render('error', { message: 'An error occurred while updating the student' });
    }
});

router.post('/student/delete/:id', async (req, res) => {
    const studentId = req.params.id;
    try {
        await Student.destroy({ where: { id: studentId } });
        res.redirect('/admin/students');
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).send('An error occurred while deleting the student');
    }
});

// Subject management routes
router.get('/subjects', async (req, res) => {
    try {
        const subjects = await Subject.findAll();
        res.render('pages/admin/subjects', { title: 'Subjects', subjects });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching subjects',
            error: error
        });
    }
});

router.get('/subject/add', (req, res) => {
    res.render('pages/admin/add-subject', { title: 'Add Subject' });
});

router.post('/subject/add', async (req, res) => {
    const { name } = req.body;
    try {
        await Subject.create({ name });
        res.redirect('/admin/subjects');
    } catch (error) {
        console.error('Error adding subject:', error);
        res.status(500).send('An error occurred while adding the subject');
    }
});

router.get('/subject/edit/:id', async (req, res) => {
    const subjectId = req.params.id;
    try {
        const subject = await Subject.findByPk(subjectId);
        res.render('pages/admin/edit-subject', { title: 'Edit Subject', subject });
    } catch (error) {
        console.error('Error fetching subject:', error);
        res.status(500).send('An error occurred while fetching the subject');
    }
});

router.post('/subject/edit/:id', async (req, res) => {
    const subjectId = req.params.id;
    const { name } = req.body;
    try {
        await Subject.update({ name }, { where: { id: subjectId } });
        res.redirect('/admin/subjects');
    } catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).send('An error occurred while updating the subject');
    }
});

router.post('/subject/delete/:id', async (req, res) => {
    const subjectId = req.params.id;
    try {
        await Subject.destroy({ where: { id: subjectId } });
        res.redirect('/admin/subjects');
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).send('An error occurred while deleting the subject');
    }
});

// Other routes (statistics, activity logs, backup/restore, reports)
router.get('/statistics', async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.count(),
            totalAssessments: await Assessment.count(),
            pendingReviews: await Assessment.count({ where: { status: 'pending' } })
        };
        res.render('pages/admin/statistics', { title: 'System Statistics', stats });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).send('An error occurred while fetching statistics');
    }
});

router.get('/activity-logs', (req, res) => {
    res.render('pages/admin/activity-logs', { title: 'Activity Logs', logs: [] });
});

router.get('/backup-restore', (req, res) => {
    res.render('pages/admin/backup-restore', { title: 'Backup/Restore' });
});

router.get('/reports', (req, res) => {
    res.render('pages/admin/reports', { title: 'Generate Reports' });
});

router.post('/generate-report', async (req, res) => {
    try {
        // Implement report generation logic here
        res.send('Report generated successfully');
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).send('An error occurred while generating the report');
    }
});

router.get('/archived-users', async (req, res) => {
    try {
        const archivedUsers = await ArchivedUser.findAll();
        res.render('pages/admin/archived-users', { title: 'Archived Users', archivedUsers });
    } catch (error) {
        console.error('Error fetching archived users:', error);
        res.status(500).send('An error occurred while fetching archived users');
    }
});

module.exports = router;