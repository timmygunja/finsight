const jwt = require("jsonwebtoken");

/**
 * Middleware для проверки JWT токена
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Требуется аутентификация" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ error: "Недействительный или истекший токен" });
    }

    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
