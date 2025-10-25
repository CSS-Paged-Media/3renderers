-- init.sql
CREATE TABLE IF NOT EXISTS pdfs (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'success', 'error')),
    status_message TEXT,
    pdf BYTEA,
    assets BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pdfs_hash ON pdfs(hash);
CREATE INDEX idx_pdfs_status ON pdfs(status);
CREATE INDEX idx_pdfs_created_at ON pdfs(created_at);

-- Cleanup old completed jobs (run as cron)
-- DELETE FROM pdfs WHERE status = 'success' AND updated_at < NOW() - INTERVAL '1 hour';
-- DELETE FROM pdfs WHERE status = 'error' AND updated_at < NOW() - INTERVAL '24 hours';