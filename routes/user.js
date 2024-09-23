// routes/user.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads');
    },
    filename: (req, file, cb) => {
        cb(null, `${req.session.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// Apply the authentication middleware
router.use(isAuthenticated);

// Profile route
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }
        res.render('pages/profile', { title: 'Profile', user, successMessage: null, errorMessage: null });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching the profile' });
    }
});

// Password change route
router.post('/profile/change-password', async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.render('pages/profile', { errorMessage: 'Current password is incorrect', user, successMessage: null });
        }

        if (newPassword !== confirmPassword) {
            return res.render('pages/profile', { errorMessage: 'New passwords do not match', user, successMessage: null });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.render('pages/profile', { successMessage: 'Password changed successfully', user, errorMessage: null });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).render('error', { message: 'An error occurred while changing the password' });
    }
});

// Profile photo upload route (with AJAX for live updates)
router.post('/profile/upload-photo', upload.single('profilePhoto'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ errorMessage: 'Please select a photo to upload' });
        }

        const user = await User.findByPk(req.session.user.id);
        user.profilePhoto = `/uploads/${req.file.filename}`;
        await user.save();

        // Ensure the session is updated with the new profile photo
        req.session.user.profilePhoto = user.profilePhoto;

        // Save the session after updating
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ errorMessage: 'Error saving session' });
            }
            res.json({ successMessage: 'Profile photo uploaded successfully', profilePhoto: user.profilePhoto });
        });
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        res.status(500).json({ errorMessage: 'An error occurred while uploading the profile photo' });
    }
});

module.exports = router;
