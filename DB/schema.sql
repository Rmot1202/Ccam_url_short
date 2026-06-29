CREATE TABLE IF NOT EXISTS users (
    user_name VARCHAR(120) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS links (
    short_code VARCHAR(20) NOT NULL PRIMARY KEY,
    user_name VARCHAR(120) NOT NULL,
    original_url TEXT NOT NULL,
    custom_alias VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ NULL,
    click_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_links_user_name
        FOREIGN KEY (user_name)
        REFERENCES users(user_name)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_links_user_name ON links(user_name);
CREATE INDEX IF NOT EXISTS idx_links_is_active ON links(is_active);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);