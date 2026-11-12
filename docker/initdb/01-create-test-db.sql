-- Runs once, the first time the addisvenue-db container initializes its data volume.
-- Creates the dedicated test database that the Vitest harness recreates per run.
-- The main "addisvenue" database is created by the POSTGRES_DB env var in docker-compose.yml.
CREATE DATABASE addisvenue_test;
