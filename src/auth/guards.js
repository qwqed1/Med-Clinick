const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt';

function attachUserIfToken(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h) return next();
  const [type, token] = h.split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'invalid_token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET); // { sub, login, role }
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

function allow({ public: isPublic = false, roles = null } = {}) {
  return (req, res, next) => {
    if (isPublic) return next();
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (roles && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

// удобные пресеты
const PUBLIC = allow({ public: true });
const AUTH = allow();
const ADMIN = allow({ roles: ['admin', 'superadmin'] });
const SUPER = allow({ roles: ['superadmin'] });

module.exports = { attachUserIfToken, allow, PUBLIC, AUTH, ADMIN, SUPER };
