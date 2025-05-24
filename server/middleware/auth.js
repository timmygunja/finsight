const jwt = require("jsonwebtoken");

/**
 * Middleware для проверки JWT токена
 */
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Требуется аутентификация" });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ error: "Недействительный или истекший токен" });
    }

    req.user = user;
    next();
  });
};
