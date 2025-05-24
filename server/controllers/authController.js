const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

/**
 * Регистрация нового пользователя
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Проверка существования пользователя
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Пользователь с таким email уже существует" });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание нового пользователя
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({ message: "Пользователь успешно зарегистрирован" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Ошибка при регистрации пользователя" });
  }
};

/**
 * Вход пользователя
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Поиск пользователя
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    // Проверка пароля
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    // Создание JWT токена
    const token = jwt.sign(
      { id: user._id, email: user.email, username: user.username },
      process.env.SECRET_KEY,
      {
        expiresIn: "24h",
      }
    );

    res.json({
      token,
      user: { id: user._id, email: user.email, username: user.username },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Ошибка при входе в систему" });
  }
};
