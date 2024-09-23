const express = require('express');
const session = require('express-session');
const path = require('path');
const { Sequelize } = require('sequelize'); // Use Sequelize directly if needed
const helmet = require('helmet');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Use environment variable for session secret
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/teacher', require('./routes/teacher'));
app.use('/headteacher', require('./routes/headteacher'));
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/user'));
app.use('/notifications', require('./routes/notifications'));
app.use('/support', require('./routes/support'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    message: err.message || 'Something went wrong!',
    error: {
      status: err.status || 500,
      stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
    }
  });
});

// Security middleware (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://code.jquery.com", "https://cdn.jsdelivr.net", "https://stackpath.bootstrapcdn.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://stackpath.bootstrapcdn.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'"]
        },
    },
}));

// Initialize Sequelize for PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Required for secure connections to PostgreSQL on Render
    }
  }
});

// Sync the database and start the server
sequelize.sync({ logging: console.log }).then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(error => {
  console.error('Unable to sync database:', error);
});

// 404 Error handling
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});
