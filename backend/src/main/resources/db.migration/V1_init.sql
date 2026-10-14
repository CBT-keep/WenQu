CREATE TABLE sys_user (
                          id                   BIGSERIAL PRIMARY KEY,
                          username             VARCHAR(64)  NOT NULL UNIQUE,
                          password_hash        VARCHAR(255) NOT NULL,
                          nickname             VARCHAR(64),
                          email                VARCHAR(128),
                          role                 VARCHAR(32)  NOT NULL DEFAULT 'USER',
                          status               VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
                          must_change_password BOOLEAN      NOT NULL DEFAULT FALSE,
                          last_login_at        BIGINT,
                          created_by           INTEGER,
                          created_at           TIMESTAMP,
                          updated_at           TIMESTAMP
);