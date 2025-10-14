// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error('[ErrorHandler]', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
};
