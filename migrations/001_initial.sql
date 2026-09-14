CREATE TABLE IF NOT EXISTS migrations (id VARCHAR(120) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
-- Apply schema.sql for the first installation, then add subsequent migrations here.
