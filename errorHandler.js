const multer = require('multer');

// Catches multer errors (file too large, bad type) and anything else that
// falls through to next(err), and returns a consistent JSON error shape.
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    console.error(err.stack || err);
    return res.status(err.status || 500).json({ message: err.message || 'Something went wrong on the server.' });
  }
  return next();
}

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
