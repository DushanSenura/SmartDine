const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Missing access token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'smartdine-dev-secret');
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function permit(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Missing authenticated user' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permission' });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  permit,
};