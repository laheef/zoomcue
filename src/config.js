import 'dotenv/config';
import { z } from 'zod';
const Env=z.object({NODE_ENV:z.enum(['development','test','production']).default('production'),PORT:z.coerce.number().default(4173),APP_URL:z.string().url(),JWT_SECRET:z.string().min(32),DATA_ENCRYPTION_KEY:z.string().regex(/^[a-f0-9]{64}$/i),MYSQL_HOST:z.string(),MYSQL_PORT:z.coerce.number().default(3306),MYSQL_DATABASE:z.string(),MYSQL_USER:z.string(),MYSQL_PASSWORD:z.string(),REDIS_URL:z.string().url(),R2_ENDPOINT:z.string().url().optional(),R2_ACCESS_KEY_ID:z.string().optional(),R2_SECRET_ACCESS_KEY:z.string().optional(),R2_BUCKET:z.string().optional(),COOKIE_SECURE:z.coerce.boolean().default(true),CORS_ORIGINS:z.string().transform(v=>v.split(',').map(x=>x.trim()).filter(Boolean))});
export const config=Env.parse(process.env);
