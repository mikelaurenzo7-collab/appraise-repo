import 'dotenv/config';
console.log('DB_URL exists:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log('DB_URL prefix:', process.env.DATABASE_URL.substring(0, 30));
} else {
  console.log('DATABASE_URL is NOT set!');
}
