const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config();


const pool = new Pool({
	connectionString:
		"postgresql://neondb_owner:npg_Ft0ivd1LHWMb@ep-cold-pine-a854cclj-pooler.eastus2.azure.neon.tech/neondb?sslmode=require",
	ssl: {
		rejectUnauthorized: false,
	},
});

async function addUser(email, password, nombre) {
	try {

		const checkUserQuery =
			"SELECT * FROM usuarios WHERE email = $1";
		const existingUser = await pool.query(checkUserQuery, [
			email,
		]);

		if (existingUser.rows.length > 0) {
			return;
		}


		const hashedPassword = await bcrypt.hash(password, 10);


		const insertUserQuery = `
      INSERT INTO usuarios (email, password, nombre)
      VALUES ($1, $2, $3)
      RETURNING id, email, nombre
    `;

		const result = await pool.query(insertUserQuery, [
			email,
			hashedPassword,
			nombre,
		]);

	} catch (error) {
		console.error("❌ Error creando usuario:", error);
	} finally {
		await pool.end();
	}
}


const args = process.argv.slice(2);

if (args.length < 3) {
	console.log(
		"📝 Uso: node addUser.js <email> <password> <nombre>"
	);
	console.log(
		'📝 Ejemplo: node addUser.js usuario@ejemplo.com micontraseña "Juan Pérez"'
	);
	process.exit(1);
}

const [email, password, nombre] = args;


if (!email.includes("@")) {
	process.exit(1);
}

if (password.length < 6) {
	console.log(
		"❌ La contraseña debe tener al menos 6 caracteres"
	);
	process.exit(1);
}

addUser(email, password, nombre);
