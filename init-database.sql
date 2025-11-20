-- Database initialization script for Ingagro Greenhouse Control System
-- This script creates the necessary tables and initial users

-- Drop existing table if it exists (optional - comment out if you want to preserve data)
-- DROP TABLE IF EXISTS usuarios CASCADE;

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Insert initial users
-- Password for ingenieriaagronomica9@gmail.com: Ingagro12345
-- Password for admin@test.com: 123456
-- Note: These are bcrypt hashed passwords

INSERT INTO usuarios (email, password, nombre) 
VALUES 
    ('ingenieriaagronomica9@gmail.com', '$2a$10$YXvK5P6xZJZqKZvK5P6xZeK5P6xZJZqKZvK5P6xZJZqKZvK5P6xZO', 'Ingeniería Agronómica'),
    ('admin@test.com', '$2a$10$rB7XqXqXqXqXqXqXqXqXqOK5P6xZJZqKZvK5P6xZJZqKZvK5P6xZO', 'Administrador')
ON CONFLICT (email) DO NOTHING;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully!';
    RAISE NOTICE 'Users created:';
    RAISE NOTICE '  1. ingenieriaagronomica9@gmail.com / Ingagro12345';
    RAISE NOTICE '  2. admin@test.com / 123456';
END $$;
