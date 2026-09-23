// Imported first by the CLI so .env is loaded before any module reads process.env.
import { config } from 'dotenv';

config({ quiet: true });
