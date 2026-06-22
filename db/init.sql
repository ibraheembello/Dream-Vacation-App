-- Dream Vacation App — database schema
-- This file is auto-executed by the postgres container on FIRST startup
-- (mounted into /docker-entrypoint-initdb.d). It creates the table that
-- backend/server.js reads & writes, so the app works end-to-end out of the box.

CREATE TABLE IF NOT EXISTS destinations (
    id         SERIAL PRIMARY KEY,
    country    VARCHAR(255) NOT NULL,
    capital    VARCHAR(255),
    population BIGINT,
    region     VARCHAR(255)
);
