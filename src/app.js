const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const urlRoutes = require('./routes/urlRoutes');
const authRoutes = require('./routes/authRoutes');
const apiLimiter = require('./middlewares/rateLimiter');
const swaggerSpec = require('./config/swagger');

const app = express();

app.use(express.json());

app.use(cors());

app.use(morgan('dev'));

app.use(apiLimiter);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

app.use('/api/url', urlRoutes);
app.use('/api/auth', authRoutes);

module.exports = app;
