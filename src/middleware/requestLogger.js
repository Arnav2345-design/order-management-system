const morgan = require('morgan');

const format = ':method :url :status :res[content-length] bytes - :response-time ms';

const requestLogger = morgan(format, {
  skip: (req) => req.url === '/health',
});

module.exports = requestLogger;