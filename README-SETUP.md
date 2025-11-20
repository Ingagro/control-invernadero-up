# Database Setup Instructions

## Environment Variables

The `.env` file has been configured with the following variables:

- **DATABASE_URL**: Connection to PostgreSQL database at 69.62.64.56:5450
- **JWT_SECRET**: Secret key for JWT authentication (⚠️ Change in production!)
- **AIO_USERNAME**: Adafruit IO username
- **AIO_KEY**: Adafruit IO key (you need to add this)
- **PORT**: Server port (default: 3000)
- **NODE_ENV**: Environment mode

## Database Setup

### Option 1: Using Node.js Script (Recommended)

Run the automated setup script:

```bash
node setup-database.js
```

This will:
- Create the `usuarios` table
- Create necessary indexes
- Add the two initial users

### Option 2: Using SQL File

If you prefer to run SQL directly:

```bash
psql postgresql://postgres:postgres@69.62.64.56:5450/ingagro -f init-database.sql
```

## Initial Users

After setup, you'll have these users:

1. **Main User**
   - Email: `ingenieriaagronomica9@gmail.com`
   - Password: `Ingagro12345`

2. **Admin User**
   - Email: `admin@test.com`
   - Password: `123456`

## Running the Application

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Run the setup script:
   ```bash
   node setup-database.js
   ```

3. Start the server:
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. Access the application:
   - Login page: http://localhost:3000/login.html
   - Main app: http://localhost:3000

## Important Notes

⚠️ **Before deploying to production:**
- Change the `JWT_SECRET` to a strong random string
- Add your actual `AIO_KEY` for Adafruit IO
- Consider using environment-specific .env files
- Never commit the .env file to version control

## Troubleshooting

If you encounter connection issues:
- Verify the database server is accessible at 69.62.64.56:5450
- Check that PostgreSQL is running
- Ensure the database "ingagro" exists
- Verify credentials: postgres/postgres
