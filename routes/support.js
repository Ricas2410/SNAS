const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables

// Support route (for receiving user messages)
router.post('/', async (req, res) => {
    let { email, message } = req.body;

    // If a user is logged in, use their email from the session
    if (req.session.user && req.session.user.email) {
        email = req.session.user.email;
    }

    // Create a transporter object using Gmail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });

    // Email options
    const mailOptions = {
        from: email,
        to: process.env.GMAIL_USER, // Admin's email (from .env)
        subject: `New Support Request from ${email}`,
        text: message
    };

    try {
        // Send email
        await transporter.sendMail(mailOptions);
        console.log('Email sent from: ' + email);
        res.redirect('/?success=Your message has been sent');
    } catch (error) {
        console.error('Error sending email:', error);
        res.redirect('/?error=Failed to send message');
    }
});

module.exports = router;
