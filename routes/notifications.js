const express = require('express');
const router = express.Router();
const { Notification, User } = require('../models');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'User not authenticated' });
    }
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied' });
    }
};

// Apply isAuthenticated middleware to all routes
router.use(isAuthenticated);

router.get('/dashboard', isAdmin, (req, res) => {
    res.render('pages/admin/dashboard', { title: 'Admin Dashboard', user: req.session.user });
});

router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.findAll();
        res.render('pages/admin/users', { title: 'User Management', users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('An error occurred while fetching users');
    }
});

router.get('/user/add', (req, res) => {
    res.render('pages/admin/add-user', { title: 'Add User' });
});

router.post('/user/add', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword, role });
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('An error occurred while adding the user');
    }
});

router.get('/user/edit/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findByPk(userId);
        res.render('pages/admin/edit-user', { title: 'Edit User', user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send('An error occurred while fetching the user');
    }
});

router.post('/user/edit/:id', async (req, res) => {
    const userId = req.params.id;
    const { username, role } = req.body;
    try {
        await User.update({ username, role }, { where: { id: userId } });
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('An error occurred while updating the user');
    }
});

router.post('/user/delete/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        await User.destroy({ where: { id: userId } });
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('An error occurred while deleting the user');
    }
});

router.get('/user/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    try {
        const userNotifications = await Notification.findAll({ where: { userId } });
        res.json(userNotifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'An error occurred while fetching notifications' });
    }
});

router.get('/user', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        console.log('Fetching notifications for user:', req.session.user.id, 'Role:', req.session.user.role);
        
        let notifications;
        if (req.session.user.role === 'headteacher') {
            const headteachers = await User.findAll({ where: { role: 'headteacher' } });
            const headteacherIds = headteachers.map(h => h.id);
            notifications = await Notification.findAll({
                where: { userId: headteacherIds },
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'message', 'read', 'type', 'assessmentId', 'createdAt', 'userId']
            });
        } else {
            notifications = await Notification.findAll({
                where: { userId: req.session.user.id },
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'message', 'read', 'type', 'assessmentId', 'createdAt', 'userId']
            });
        }

        const unreadNotifications = notifications.filter(n => !n.read);
        const readNotifications = notifications.filter(n => n.read);

        console.log('Unread notifications:', unreadNotifications.length);
        console.log('Read notifications:', readNotifications.length);

        res.json({ unread: unreadNotifications, read: readNotifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'An error occurred while fetching notifications' });
    }
});

router.post('/mark-read/:id', async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.id);
        if (notification) {
            notification.read = true;
            await notification.save();
            console.log('Notification marked as read:', notification.id);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Notification not found' });
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'An error occurred while marking the notification as read' });
    }
});

router.get('/history', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/auth/login');
        }

        let notifications = await Notification.findAll({
            where: { userId: req.session.user.id },
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'message', 'read', 'type', 'assessmentId', 'createdAt', 'userId']
        });

        res.render('pages/notification-history', { 
            title: 'Notification History',
            notifications,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching notification history:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching notification history' });
    }
});

router.post('/delete/:id', async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.id);
        if (notification && notification.userId === req.session.user.id) {
            await notification.destroy();
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Notification not found or unauthorized' });
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'An error occurred while deleting the notification' });
    }
});

module.exports = router;