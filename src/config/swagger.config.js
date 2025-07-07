import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Real-Time Chat API',
      version: '1.0.0',
      description: 'Gerçek zamanlı sohbet uygulaması için kapsamlı REST API. Socket.IO, Elasticsearch, RabbitMQ ve Redis entegrasyonu ile güçlendirilmiş.',
      contact: {
        name: 'API Destek',
        email: 'destek@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
        description: 'Geliştirme sunucusu'
      },
      {
        url: 'https://api.example.com',
        description: 'Üretim sunucusu'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token ile yetkilendirme. Token\'ı "Bearer {token}" formatında gönderin.'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Hata mesajı'
            },
            error: {
              type: 'string',
              description: 'Detaylı hata bilgisi'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Başarı mesajı'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'İşlem zamanı'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
