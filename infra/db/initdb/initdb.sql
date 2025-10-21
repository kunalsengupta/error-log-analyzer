-- Enable UUID generation (Prisma uses uuid() by default in your models)
CREATE EXTENSION IF NOT EXISTS pgcrypto;        -- gen_random_uuid()
-- If you prefer uuid-ossp instead, uncomment:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
