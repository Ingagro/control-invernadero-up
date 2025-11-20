const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret - Use environment variable
const JWT_SECRET = process.env.JWT_SECRET;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

// Test database connection
pool
  .connect()
  .then(() => console.log("✅ Conectado a PostgreSQL"))
  .catch((err) => console.error("❌ Error conectando a PostgreSQL:", err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files middleware - only for local development
if (process.env.NODE_ENV !== "production") {
  app.use(express.static(path.join(__dirname, "public")));
  app.use("/assets", express.static(path.join(__dirname, "public", "assets")));
  app.use("/js", express.static(path.join(__dirname, "public", "js")));
}

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido" });
  }
};

// Middleware para redirigir a login si no hay sesión
const requireAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect("/login.html");
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.clearCookie("token");
    return res.redirect("/login.html");
  }
};

// Authentication routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y contraseña son requeridos",
      });
    }

    const userQuery = "SELECT * FROM usuarios WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message, // Expose error for debugging
    });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({
    success: true,
    message: "Sesión cerrada exitosamente",
  });
});

app.get("/api/auth/verify", verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

app.post("/api/auth/recover", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email es requerido",
      });
    }

    const userQuery = "SELECT * FROM usuarios WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: "Si el email existe, se enviará un enlace de recuperación",
      });
    }

    console.log(`Solicitud de recuperación para: ${email}`);

    res.json({
      success: true,
      message:
        "Se ha enviado un enlace de recuperación a tu correo electrónico",
    });
  } catch (error) {
    console.error("Error en recuperación:", error);
    res.status(500).json({
      error: "Error interno del servidor",
    });
  }
});

app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "La nueva contraseña debe tener al menos 6 caracteres",
      });
    }

    const userQuery = "SELECT * FROM usuarios WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const user = userResult.rows[0];

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE usuarios SET password = $1, updated_at = NOW() WHERE id = $2",
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: "Contraseña cambiada exitosamente",
    });
  } catch (error) {
    console.error("Error en cambio de contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Protected routes
app.get("/", (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect("/index.html");
    } catch (error) {
      res.clearCookie("token");
    }
  }
  res.redirect("/login.html");
});

app.get("/index.html", requireAuth, (req, res) => {
  const fs = require("fs");
  const indexPath = path.join(__dirname, "public", "index.html");
  let indexContent = fs.readFileSync(indexPath, "utf8");

  // Always inject environment variables before closing head tag
  const envScript = `
	<script>
		window.AIO_USERNAME = "${process.env.AIO_USERNAME}";
		window.AIO_KEY = "${process.env.AIO_KEY}";
	</script>`;

  indexContent = indexContent.replace("</head>", envScript + "\n</head>");

  res.send(indexContent);
});

app.get("/login.html", (req, res) => {
  const fs = require("fs");
  const loginPath = path.join(__dirname, "public", "login.html");
  let loginContent = fs.readFileSync(loginPath, "utf8");

  // Always inject environment variables before closing head tag
  const envScript = `
	<script>
		window.AIO_USERNAME = "${process.env.AIO_USERNAME || "Ingagro"}";
		window.AIO_KEY = "${process.env.AIO_KEY}";
	</script>`;

  loginContent = loginContent.replace("</head>", envScript + "\n</head>");

  res.send(loginContent);
});

// API for sensor data (protected)
app.get("/api/sensors", verifyToken, (req, res) => {
  res.json({
    message: "Datos de sensores",
    user: req.user,
  });
});

// API endpoint to get environment variables
app.get("/api/config", (req, res) => {
  res.json({
    AIO_USERNAME: process.env.AIO_USERNAME || "Ingagro",
    AIO_KEY: process.env.AIO_KEY,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Database initialization
async function initializeDatabase() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log("✅ Tabla usuarios verificada/creada");

    const testUserEmail = "admin@test.com";
    const checkUserQuery = "SELECT * FROM usuarios WHERE email = $1";
    const existingUser = await pool.query(checkUserQuery, [testUserEmail]);

    if (existingUser.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      const insertUserQuery = `
        INSERT INTO usuarios (email, password, nombre)
        VALUES ($1, $2, $3)
      `;
      await pool.query(insertUserQuery, [
        testUserEmail,
        hashedPassword,
        "Administrador",
      ]);
      console.log("✅ Usuario de prueba creado: admin@test.com / 123456");
    }
  } catch (error) {
    console.error("❌ Error inicializando base de datos:", error);
  }
}

// Start server
if (require.main === module) {
  app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📝 Login en: http://localhost:${PORT}/login.html`);
  });
} else {
  // Initialize database when running as a module (e.g., Vercel)
  initializeDatabase().catch((err) =>
    console.error("❌ Error initializing database:", err)
  );
}

// Error handlers
process.on("unhandledRejection", (err, promise) => {
  console.error("❌ Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

// Export for Vercel
module.exports = app;
