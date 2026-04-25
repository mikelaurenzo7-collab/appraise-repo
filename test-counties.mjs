import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'gateway05.us-east-1.prod.aws.tidbcloud.com',
  user: '3eWPFCBhXN3VhAz.73abdd537737',
  password: '7wXJ8lN14T8S3RWOwjGd',
  database: 'njPZ7GrdvQti9UYLXGdrDo',
  port: 4000,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function test() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database');
    
    // Check if counties table has data
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM counties');
    console.log('Total counties:', rows[0].count);
    
    // Check counties for TX
    const [txCounties] = await connection.query('SELECT * FROM counties WHERE state = ? LIMIT 5', ['TX']);
    console.log('TX counties:', txCounties);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
