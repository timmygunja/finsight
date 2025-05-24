const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");

// Регистрация нового пользователя
router.post("/register", register);

// Вход пользователя
router.post("/login", login);

module.exports = router;
