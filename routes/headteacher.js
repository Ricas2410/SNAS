const express = require('express');
const router = express.Router();
const { Class, Student, Assessment, SubjectAssessment, Subject, User, Notification } = require('../models');

// Middleware to check if user is a headteacher
const isHeadteacher = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'headteacher') {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

router.use(isHeadteacher);

router.get('/dashboard', async (req, res) => {
    try {
        const classes = await Class.findAll();
        const pendingAssessments = await Assessment.findAll({
            where: { status: 'pending' },
            include: [{ model: Student }, { model: User, as: 'Teacher' }]
        });
        res.render('pages/headteacher/dashboard', { 
            title: 'Headteacher Dashboard', 
            classes,
            pendingAssessments,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching dashboard data' });
    }
});

router.get('/class/:id', async (req, res) => {
    const classId = req.params.id;
    try {
        const classItem = await Class.findByPk(classId, {
            include: [{ model: Student }]
        });
        res.render('pages/headteacher/class', { 
            title: `Class ${classItem.name}`, 
            classItem,
            students: classItem.Students
        });
    } catch (error) {
        console.error('Error fetching class details:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching class details' });
    }
});

router.get('/student/:id', async (req, res) => {
    const studentId = req.params.id;
    try {
        const student = await Student.findByPk(studentId);
        if (!student) {
            throw new Error('Student not found');
        }
        const pendingAssessments = await Assessment.findAll({
            where: { studentId, status: 'pending' },
            include: [{ model: User, as: 'Teacher' }]
        });
        const pastAssessments = await Assessment.findAll({
            where: { studentId, status: ['approved', 'changes-requested'] },
            include: [{ model: User, as: 'Teacher' }]
        });
        res.render('pages/headteacher/student', {
            title: `Student: ${student.name}`,
            student,
            pendingAssessments,
            pastAssessments
        });
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching student details',
            error: {
                status: 500,
                stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
            }
        });
    }
});

router.get('/assessment/:id', async (req, res) => {
    try {
        const assessment = await Assessment.findByPk(req.params.id, {
            include: [
                { model: Student },
                { model: User, as: 'Teacher' },
                { model: SubjectAssessment, include: [Subject] }
            ]
        });
        if (!assessment) {
            return res.status(404).render('error', { message: 'Assessment not found' });
        }
        res.render('pages/headteacher/review-assessment', { 
            title: 'Review Assessment', 
            assessment 
        });
    } catch (error) {
        console.error('Error fetching assessment:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching the assessment',
            error: {
                status: 500,
                stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
            }
        });
    }
});

router.get('/assessment/review/:id', async (req, res) => {
    try {
        const assessment = await Assessment.findByPk(req.params.id, {
            include: [
                { model: Student },
                { model: SubjectAssessment, include: ['Subject'] }
            ]
        });

        if (!assessment) {
            return res.status(404).render('error', { message: 'Assessment not found' });
        }

        res.render('pages/headteacher/review-assessment', { 
            title: 'Review Assessment', 
            assessment,
            student: assessment.Student,
            subjectAssessments: assessment.SubjectAssessments
        });
    } catch (error) {
        console.error('Error fetching assessment for review:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching the assessment' });
    }
});

router.post('/assessment/:id/approve', async (req, res) => {
    const assessmentId = req.params.id;
    const { headteacherComment } = req.body;
    try {
        const assessment = await Assessment.findByPk(assessmentId, {
            include: [{ model: Student }, { model: User, as: 'Teacher' }]
        });

        if (!assessment) {
            return res.status(404).render('error', { message: 'Assessment not found' });
        }

        assessment.status = 'approved';
        assessment.headteacherComment = headteacherComment;
        await assessment.save();

        // Create a notification for the teacher
        await Notification.create({
            userId: assessment.Teacher.id,
            message: `Assessment for ${assessment.Student.name} has been approved`,
            type: 'assessment_approved',
            read: false
        });

        res.redirect('/headteacher/dashboard');
    } catch (error) {
        console.error('Error approving assessment:', error);
        res.status(500).render('error', { message: 'An error occurred while approving the assessment' });
    }
});

router.post('/assessment/:id/request-changes', async (req, res) => {
    const assessmentId = req.params.id;
    const { changeRequest, headteacherComment } = req.body;
    try {
        const assessment = await Assessment.findByPk(assessmentId, {
            include: [{ model: Student }, { model: User, as: 'Teacher' }]
        });

        if (!assessment) {
            return res.status(404).render('error', { message: 'Assessment not found' });
        }

        assessment.status = 'changes-requested';
        assessment.headteacherComment = headteacherComment;
        await assessment.save();

        // Create a notification for the teacher
        await Notification.create({
            userId: assessment.Teacher.id,
            message: `Changes requested for assessment of ${assessment.Student.name}`,
            type: 'assessment_change_request',
            read: false
        });

        res.redirect('/headteacher/dashboard');
    } catch (error) {
        console.error('Error requesting changes:', error);
        res.status(500).render('error', { message: 'An error occurred while requesting changes' });
    }
});

router.post('/assessment/approve/:id', async (req, res) => {
    try {
        const assessment = await Assessment.findByPk(req.params.id, { include: [Student] });
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        assessment.status = 'approved';
        await assessment.save();
        console.log('Assessment approved:', assessment.id);

        // Notify the teacher
        const notification = await Notification.create({
            userId: assessment.teacherId,
            message: `Assessment for ${assessment.Student.name} (Week ${assessment.weekNumber}) has been approved`,
            type: 'assessment_approved',
            read: false,
            assessmentId: assessment.id
        });
        console.log('Notification created for teacher:', notification.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error approving assessment or creating notification:', error);
        res.status(500).json({ error: 'An error occurred while approving the assessment' });
    }
});

router.post('/assessment/request-changes/:id', async (req, res) => {
    try {
        const { comment } = req.body;
        const assessment = await Assessment.findByPk(req.params.id, { include: [Student] });
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        assessment.status = 'changes-requested';
        assessment.headteacherComment = comment;
        await assessment.save();
        console.log('Changes requested for assessment:', assessment.id);

        // Notify the teacher
        const notification = await Notification.create({
            userId: assessment.teacherId,
            message: `Changes requested for ${assessment.Student.name}'s assessment (Week ${assessment.weekNumber})`,
            type: 'assessment_changes_requested',
            read: false,
            assessmentId: assessment.id
        });
        console.log('Notification created for teacher:', notification.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error requesting changes or creating notification:', error);
        res.status(500).json({ error: 'An error occurred while requesting changes' });
    }
});

router.get('/past-assessments', async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Get the current page from query params
    const limit = 1; // Number of assessments per page
    const offset = (page - 1) * limit; // Calculate offset

    try {
        const { count, rows } = await Assessment.findAndCountAll({
            where: { status: 'approved' },
            include: [{ model: Student }],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const totalPages = Math.ceil(count / limit); // Calculate total pages

        res.render('pages/headteacher/past-assessments', { 
            title: 'Past Assessments',
            assessments: rows,
            currentPage: page,
            totalPages,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching past assessments:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching past assessments' });
    }
});

router.get('/classes', async (req, res) => {
    try {
        const classes = await Class.findAll({
            include: [{ model: Student }] // Include students if needed
        });

        res.render('pages/headteacher/classes', {
            title: 'Classes',
            classes
        });
    } catch (error) {
        console.error('Error fetching class details:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching class details' });
    }
});

router.get('/class/:id/students', async (req, res) => {
    const classId = req.params.id;
    try {
        const classItem = await Class.findByPk(classId, {
            include: [{ model: Student }]
        });

        if (!classItem) {
            return res.status(404).send('Class not found');
        }

        res.render('pages/headteacher/students', {
            title: `Students in ${classItem.name}`,
            students: classItem.Students
        });
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching student details' });
    }
});

router.get('/students', async (req, res) => {
    try {
        const students = await Student.findAll({
            include: [{ model: Class }] // Include class information if needed
        });

        res.render('pages/headteacher/students', {
            title: 'All Students',
            students
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching students' });
    }
});

module.exports = router;
