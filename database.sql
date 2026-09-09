-- Active: 1788949895037@@127.0.0.1@5432@smart_connects
SELECT * FROM information_schema.tables
WHERE table_schema = 'public';

SELECT current_database();

select * from users;