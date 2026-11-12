// middleware/auth.middleware.js
const { verifyToken } = require('../utils/jwt.util');

function authMiddleware(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }


  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
