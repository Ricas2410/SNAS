const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { User, Class, Student, Subject, Assessment, SubjectAssessment, Notification } = require('../models');

// Middleware to check if user is a teacher
const isTeacher = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'teacher') {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// Add this middleware before your routes
router.use((req, res, next) => {
    console.log('Incoming request:', req.method, req.url);
    next();
});

router.use(isTeacher);

router.get('/dashboard', async (req, res) => {
    try {
        const user = req.user; // Assuming you have user info in the session
        const classes = await Class.findAll({
            where: { teacherId: user.id } // Fetch classes assigned to the teacher
        });

        const pendingAssessments = await Assessment.findAll({
            where: { teacherId: user.id, status: 'pending' },
            include: [{ model: Student }]
        });

        const assessmentsNeedingChanges = await Assessment.findAll({
            where: { teacherId: user.id, needsChanges: true },
            include: [{ model: Student }]
        });

        res.render('pages/teacher/dashboard', {
            title: 'Teacher Dashboard',
            user,
            classes, // Pass classes to the view
            pendingAssessments,
            assessmentsNeedingChanges
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('An error occurred while fetching dashboard data');
    }
});

router.get('/class/:id', async (req, res) => {
    try {
        console.log('Fetching class with ID:', req.params.id);
        const classItem = await Class.findByPk(req.params.id, { 
            include: [{ model: Student }]
        });

        if (!classItem) {
            throw new Error('Class not found');
        }

        console.log('Class found:', classItem.name);
        console.log('Students:', classItem.Students.map(s => s.name));

        res.render('pages/teacher/class', { 
            title: `Class: ${classItem.name}`, 
            classItem: classItem,
            students: classItem.Students
        });
    } catch (error) {
        console.error('Error fetching class:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching class details',
            error: {
                status: 500,
                stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
            }
        });
    }
});

router.get('/student/:id', async (req, res) => {
    try {
        const student = await Student.findByPk(req.params.id, {
            include: [{ model: Class }]
        });
        if (!student) {
            throw new Error('Student not found');
        }
        res.render('pages/teacher/student', { title: `Student: ${student.name}`, student });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching student details',
            error: {
                status: 500,
                stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
            }
        });
    }
});

router.get('/assessment/new/:studentId', async (req, res) => {
    try {
        console.log('Fetching student with ID:', req.params.studentId);
        const student = await Student.findByPk(req.params.studentId, {
            include: [{ model: Class, include: [Subject] }]
        });

        if (!student) {
            throw new Error('Student not found');
        }

        console.log('Student:', JSON.stringify(student, null, 2));

        if (!student.Class) {
            throw new Error('Student is not assigned to a class');
        }

        console.log('Class:', JSON.stringify(student.Class, null, 2));

        const subjects = student.Class.Subjects;

        console.log('Subjects:', JSON.stringify(subjects, null, 2));

        res.render('pages/teacher/new-assessment', { 
            title: 'New Assessment', 
            student, 
            subjects 
        });
    } catch (error) {
        console.error('Error preparing new assessment:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).render('error', { 
            message: 'An error occurred while preparing the new assessment',
            error: {
                status: 500,
                stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
            }
        });
    }
});

router.post('/assessment/create', async (req, res) => {
    try {
        const { studentId, date, weekNumber, subjects, summary } = req.body;
        
        // Fetch the student
        const student = await Student.findByPk(studentId);
        if (!student) {
            throw new Error('Student not found');
        }

        // Create the assessment
        const assessment = await Assessment.create({
            studentId,
            teacherId: req.session.user.id,
            date,
            weekNumber,
            summary,
            status: 'pending'
        });

        // Create subject assessments
        for (const [subjectId, comment] of Object.entries(subjects)) {
            await SubjectAssessment.create({
                assessmentId: assessment.id,
                subjectId,
                comment
            });
        }

        // Create a notification for all headteachers
        const headteachers = await User.findAll({ where: { role: 'headteacher' } });
        console.log('Headteachers found:', headteachers.map(h => h.id));
        for (const headteacher of headteachers) {
            const notification = await Notification.create({
                userId: headteacher.id,
                message: `New assessment submitted for ${student.name} (Week ${weekNumber})`,
                type: 'new_assessment',
                read: false,
                assessmentId: assessment.id
            });
            console.log('Notification created for headteacher:', headteacher.id, 'Notification ID:', notification.id);
        }

        // Add this log to check all notifications for headteachers
        const allHeadteacherNotifications = await Notification.findAll({ 
            where: { userId: headteachers.map(h => h.id) }
        });
        console.log('All notifications for headteachers:', allHeadteacherNotifications.map(n => ({ id: n.id, type: n.type, userId: n.userId })));

        res.redirect('/teacher/dashboard');
    } catch (error) {
        console.error('Error creating assessment:', error);
        res.status(500).render('error', { message: 'An error occurred while creating the assessment' });
    }
});

router.get('/assessment/past/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const student = await Student.findByPk(studentId);
        
        if (!student) {
            return res.status(404).render('error', { message: 'Student not found' });
        }

        const assessments = await Assessment.findAll({
            where: { studentId: studentId },
            include: [
                { 
                    model: SubjectAssessment,
                    include: [Subject]
                },
                {
                    model: Student
                }
            ],
            order: [['weekNumber', 'DESC']]
        });

        res.render('pages/teacher/past-assessments', { 
            title: 'Past Assessments',
            student: student,
            assessments: assessments
        });
    } catch (error) {
        console.error('Error fetching past assessments:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching past assessments' });
    }
});

router.get('/assessment/view/:id', async (req, res) => {
    try {
        const assessment = await Assessment.findByPk(req.params.id, {
            include: [
                { model: Student },
                { 
                    model: SubjectAssessment,
                    include: [{ model: Subject, required: false }]
                }
            ]
        });

        if (!assessment) {
            return res.status(404).render('error', { message: 'Assessment not found' });
        }

        res.render('pages/teacher/view-assessment', { 
            title: 'View Assessment',
            assessment,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching assessment:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching the assessment' });
    }
});

router.get('/assessments-needing-changes', async (req, res) => {
    try {
        const assessments = await Assessment.findAll({
            where: { status: 'needs_changes', teacherId: req.session.user.id },
            include: [Student]
        });
        res.render('pages/teacher/assessments-needing-changes', { title: 'Assessments Needing Changes', assessments });
    } catch (error) {
        console.error('Error fetching assessments needing changes:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching assessments needing changes',
            error: {
                status: 500,
                stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
            }
        });
    }
});

router.get('/pending-assessments', async (req, res) => {
    try {
        const pendingAssessments = await Assessment.findAll({
            where: { status: 'pending', teacherId: req.session.user.id },
            include: [{ model: Student }],
            order: [['createdAt', 'DESC']]
        });
        res.render('pages/teacher/pending-assessments', { 
            title: 'Pending Assessments', 
            pendingAssessments,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching pending assessments:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching pending assessments' });
    }
});

router.get('/assessment/edit/:id', async (req, res) => {
    try {
        const assessment = await Assessment.findByPk(req.params.id, {
            include: [
                { model: Student },
                { 
                    model: SubjectAssessment,
                    include: [Subject]
                }
            ]
        });
        if (!assessment) {
            return res.status(404).render('error', { message: 'Assessment not found' });
        }
        const subjects = await Subject.findAll();
        res.render('pages/teacher/edit-assessment', { 
            title: 'Edit Assessment', 
            assessment,
            subjects,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching assessment:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching the assessment' });
    }
});

router.post('/assessment/update/:id', async (req, res) => {
    try {
        const { date, weekNumber, subjects, summary } = req.body;
        const assessment = await Assessment.findByPk(req.params.id, {
            include: [
                { model: Student },
                { model: SubjectAssessment, include: [Subject] }
            ]
        });
        if (!assessment) {
            return res.status(404).render('error', { message: 'Assessment not found' });
        }
        
        assessment.date = date;
        assessment.weekNumber = weekNumber;
        assessment.summary = summary;
        assessment.status = 'pending';
        assessment.headteacherComment = null;
        await assessment.save();

        // Update or create SubjectAssessments
        for (const [subjectId, comment] of Object.entries(subjects)) {
            const [subjectAssessment] = await SubjectAssessment.findOrCreate({
                where: { assessmentId: assessment.id, subjectId: subjectId },
                defaults: { comment: comment }
            });

            if (subjectAssessment.comment !== comment) {
                subjectAssessment.comment = comment;
                await subjectAssessment.save();
            }
        }

        // Notify headteacher of updated assessment
        const headteacher = await User.findOne({ where: { role: 'headteacher' } });
        if (headteacher) {
            await Notification.create({
                userId: headteacher.id,
                message: `Assessment for ${assessment.Student.name} has been updated and is ready for review`,
                type: 'assessment_updated',
                read: false
            });
        }

        res.redirect('/teacher/dashboard');
    } catch (error) {
        console.error('Error updating assessment:', error);
        res.status(500).render('error', { message: 'An error occurred while updating the assessment' });
    }
});

module.exports = router;
