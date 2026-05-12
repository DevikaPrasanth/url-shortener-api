const swaggerJsDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'URL Shortener API',
      version: '1.0.0',
      description:
        'Production-style URL Shortener Backend API'
    },

    servers: [
  {
    url: process.env.BASE_URL
  }
],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },

    security: [
      {
        bearerAuth: []
      }
    ]
  },

  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
