const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function setupDatabase() {
    try {
        console.log("🔄 Connecting to database...");
        await pool.connect();
        console.log("✅ Connected to PostgreSQL");

        // Create usuarios table
        console.log("\n🔄 Creating usuarios table...");
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
        console.log("✅ Table 'usuarios' created/verified");

        // Create index
        console.log("\n🔄 Creating index...");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)");
        console.log("✅ Index created");

        // Create users
        console.log("\n🔄 Creating users...");
        
        const users = [
            {
                email: "ingenieriaagronomica9@gmail.com",
                password: "Ingagro12345",
                nombre: "Ingeniería Agronómica"
            },
            {
                email: "admin@test.com",
                password: "123456",
                nombre: "Administrador"
            }
        ];

        for (const user of users) {
            const checkUserQuery = "SELECT * FROM usuarios WHERE email = $1";
            const existingUser = await pool.query(checkUserQuery, [user.email]);

            if (existingUser.rows.length === 0) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                const insertUserQuery = `
                    INSERT INTO usuarios (email, password, nombre)
                    VALUES ($1, $2, $3)
                `;
                await pool.query(insertUserQuery, [
                    user.email,
                    hashedPassword,
                    user.nombre
                ]);
                console.log(`✅ User created: ${user.email} / ${user.password}`);
            } else {
                console.log(`ℹ️  User already exists: ${user.email}`);
            }
        }

        console.log("\n🎉 Database setup completed successfully!");
        console.log("\n📋 Available users:");
        console.log("   1. ingenieriaagronomica9@gmail.com / Ingagro12345");
        console.log("   2. admin@test.com / 123456");

    } catch (error) {
        console.error("❌ Error setting up database:", error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log("\n👋 Connection closed");
    }
}

setupDatabase();
