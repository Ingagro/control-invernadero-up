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

// JWT Secret - In production, use environment variable
const JWT_SECRET =
	process.env.JWT_SECRET ||
	"your-super-secret-jwt-key-change-this-in-production";

// PostgreSQL connection
const pool = new Pool({
	connectionString:
		"postgresql://neondb_owner:npg_Ft0ivd1LHWMb@ep-cold-pine-a854cclj-pooler.eastus2.azure.neon.tech/neondb?sslmode=require",
	ssl: {
		rejectUnauthorized: false,
	},
});

// Test database connection
pool
	.connect()
	.then(() => console.log("✅ Conectado a PostgreSQL"))
	.catch((err) =>
		console.error("❌ Error conectando a PostgreSQL:", err)
	);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname)));

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
	const token =
		req.cookies.token ||
		req.headers.authorization?.split(" ")[1];

	if (!token) {
		return res
			.status(401)
			.json({ error: "Token de acceso requerido" });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		next();
	} catch (error) {
		return res
			.status(403)
			.json({ error: "Token inválido" });
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

// Rutas de autenticación
app.post("/api/auth/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({
				error: "Email y contraseña son requeridos",
			});
		}

		// Buscar usuario en la base de datos
		const userQuery =
			"SELECT * FROM usuarios WHERE email = $1";
		const userResult = await pool.query(userQuery, [email]);

		if (userResult.rows.length === 0) {
			return res.status(401).json({
				error: "Credenciales inválidas",
			});
		}

		const user = userResult.rows[0];

		// Verificar contraseña
		const isValidPassword = await bcrypt.compare(
			password,
			user.password
		);

		if (!isValidPassword) {
			return res.status(401).json({
				error: "Credenciales inválidas",
			});
		}

		// Generar JWT
		const token = jwt.sign(
			{
				id: user.id,
				email: user.email,
				nombre: user.nombre,
			},
			JWT_SECRET,
			{ expiresIn: "24h" }
		);

		// Configurar cookie con el token
		res.cookie("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 24 * 60 * 60 * 1000, // 24 horas
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
		});
	}
});

// Ruta para cerrar sesión
app.post("/api/auth/logout", (req, res) => {
	res.clearCookie("token");
	res.json({
		success: true,
		message: "Sesión cerrada exitosamente",
	});
});

// Ruta para verificar sesión
app.get("/api/auth/verify", verifyToken, (req, res) => {
	res.json({
		success: true,
		user: req.user,
	});
});

// Ruta para recuperación de contraseña (placeholder)
app.post("/api/auth/recover", async (req, res) => {
	try {
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({
				error: "Email es requerido",
			});
		}

		// Verificar si el usuario existe
		const userQuery =
			"SELECT * FROM usuarios WHERE email = $1";
		const userResult = await pool.query(userQuery, [email]);

		if (userResult.rows.length === 0) {
			// Por seguridad, no revelamos si el email existe o no
			return res.json({
				success: true,
				message:
					"Si el email existe, se enviará un enlace de recuperación",
			});
		}

		// Aquí implementarías el envío de email de recuperación
		// Por ahora solo simulamos la respuesta
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

// Cambiar contraseña
app.post("/api/auth/change-password", async (req, res) => {
	try {
		const { email, currentPassword, newPassword } =
			req.body;
		if (!email || !currentPassword || !newPassword) {
			return res
				.status(400)
				.json({ error: "Todos los campos son requeridos" });
		}
		if (newPassword.length < 6) {
			return res
				.status(400)
				.json({
					error:
						"La nueva contraseña debe tener al menos 6 caracteres",
				});
		}
		// Buscar usuario
		const userQuery =
			"SELECT * FROM usuarios WHERE email = $1";
		const userResult = await pool.query(userQuery, [email]);
		if (userResult.rows.length === 0) {
			return res
				.status(401)
				.json({ error: "Credenciales inválidas" });
		}
		const user = userResult.rows[0];
		// Verificar contraseña actual
		const isValidPassword = await bcrypt.compare(
			currentPassword,
			user.password
		);
		if (!isValidPassword) {
			return res
				.status(401)
				.json({ error: "Credenciales inválidas" });
		}
		// Actualizar contraseña
		const hashedPassword = await bcrypt.hash(
			newPassword,
			10
		);
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
		res
			.status(500)
			.json({ error: "Error interno del servidor" });
	}
});

// Rutas protegidas - requieren autenticación
app.get("/", requireAuth, (req, res) => {
	res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/index.html", requireAuth, (req, res) => {
	res.sendFile(path.join(__dirname, "index.html"));
});

// Rutas públicas
app.get("/login.html", (req, res) => {
	// Si ya está autenticado, redirigir al dashboard
	const token = req.cookies.token;
	if (token) {
		try {
			jwt.verify(token, JWT_SECRET);
			return res.redirect("/");
		} catch (error) {
			// Token inválido, continuar mostrando login
			res.clearCookie("token");
		}
	}
	res.sendFile(path.join(__dirname, "login.html"));
});

// API para obtener datos de sensores (protegida)
app.get("/api/sensors", verifyToken, (req, res) => {
	// Aquí podrías implementar la lógica para obtener datos de sensores
	res.json({
		message: "Datos de sensores",
		user: req.user,
	});
});

// Middleware para manejar rutas no encontradas
app.use("*", (req, res) => {
	res.status(404).json({ error: "Ruta no encontrada" });
});

// Función para crear tabla de usuarios si no existe
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

		// Crear usuario de prueba si no existe
		const testUserEmail = "admin@test.com";
		const checkUserQuery =
			"SELECT * FROM usuarios WHERE email = $1";
		const existingUser = await pool.query(checkUserQuery, [
			testUserEmail,
		]);

		if (existingUser.rows.length === 0) {
			const hashedPassword = await bcrypt.hash(
				"123456",
				10
			);
			const insertUserQuery = `
        INSERT INTO usuarios (email, password, nombre)
        VALUES ($1, $2, $3)
      `;
			await pool.query(insertUserQuery, [
				testUserEmail,
				hashedPassword,
				"Administrador",
			]);
			console.log(
				"✅ Usuario de prueba creado: admin@test.com / 123456"
			);
		}
	} catch (error) {
		console.error(
			"❌ Error inicializando base de datos:",
			error
		);
	}
}

// Inicializar servidor
app.listen(PORT, async () => {
	await initializeDatabase();
	console.log(
		`🚀 Servidor corriendo en http://localhost:${PORT}`
	);
	console.log(
		`📝 Login en: http://localhost:${PORT}/login.html`
	);
});

// Manejo de errores no capturados
process.on("unhandledRejection", (err, promise) => {
	console.error("❌ Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
	console.error("❌ Uncaught Exception:", err);
	process.exit(1);
});
