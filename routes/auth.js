const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User } = require('../models');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/dashboard'); // Redirect to dashboard if already logged in
    }
    next();
};

router.get('/login', isAuthenticated, (req, res) => {
    res.render('pages/login', { title: 'Login' });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username } });
        if (user && await bcrypt.compare(password, user.password)) {
  
            req.session.user = { 
                id: user.id, 
                username: user.username, 
                fullName: user.fullName, 
                role: user.role,
                profilePhoto: user.profilePhoto || 'https://via.placeholder.com/150'
            };
            
            // Redirect based on role
            switch (user.role) {
                case 'admin':
                    return res.redirect('/admin/dashboard');
                case 'headteacher':
                    return res.redirect('/headteacher/dashboard');
                case 'teacher':
                    return res.redirect('/teacher/dashboard');
                default:
                    res.render('pages/login', { title: 'Login', error: 'Unknown role' });
            }
        } else {
            res.render('pages/login', { title: 'Login', error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('pages/login', { title: 'Login', error: 'An error occurred during login' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;
