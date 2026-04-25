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

const counties = [
  // Texas
  { state: 'TX', countyName: 'Travis County', countyCode: '48453', poaDeadlineDays: 90, proSeDeadlineDays: 90, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  { state: 'TX', countyName: 'Harris County', countyCode: '48201', poaDeadlineDays: 90, proSeDeadlineDays: 90, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  { state: 'TX', countyName: 'Dallas County', countyCode: '48113', poaDeadlineDays: 90, proSeDeadlineDays: 90, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  { state: 'TX', countyName: 'Tarrant County', countyCode: '48439', poaDeadlineDays: 90, proSeDeadlineDays: 90, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  { state: 'TX', countyName: 'Bexar County', countyCode: '48029', poaDeadlineDays: 90, proSeDeadlineDays: 90, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  
  // Illinois
  { state: 'IL', countyName: 'Cook County', countyCode: '17031', poaDeadlineDays: 60, proSeDeadlineDays: 60, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  { state: 'IL', countyName: 'DuPage County', countyCode: '17043', poaDeadlineDays: 60, proSeDeadlineDays: 60, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  
  // New Jersey
  { state: 'NJ', countyName: 'Bergen County', countyCode: '34003', poaDeadlineDays: 45, proSeDeadlineDays: 45, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'mail_certified', poaEligible: true },
  { state: 'NJ', countyName: 'Essex County', countyCode: '34013', poaDeadlineDays: 45, proSeDeadlineDays: 45, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'mail_certified', poaEligible: true },
  
  // Connecticut
  { state: 'CT', countyName: 'Fairfield County', countyCode: '09001', poaDeadlineDays: 30, proSeDeadlineDays: 30, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'mail_certified', poaEligible: true },
  
  // Wisconsin
  { state: 'WI', countyName: 'Milwaukee County', countyCode: '55079', poaDeadlineDays: 60, proSeDeadlineDays: 60, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  
  // Ohio
  { state: 'OH', countyName: 'Franklin County', countyCode: '39049', poaDeadlineDays: 75, proSeDeadlineDays: 75, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  
  // Pennsylvania
  { state: 'PA', countyName: 'Philadelphia County', countyCode: '42101', poaDeadlineDays: 60, proSeDeadlineDays: 60, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'mail_certified', poaEligible: true },
  
  // California
  { state: 'CA', countyName: 'Los Angeles County', countyCode: '06037', poaDeadlineDays: 60, proSeDeadlineDays: 60, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
  
  // New York
  { state: 'NY', countyName: 'New York County', countyCode: '36061', poaDeadlineDays: 30, proSeDeadlineDays: 30, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'mail_certified', poaEligible: true },
  
  // Florida
  { state: 'FL', countyName: 'Miami-Dade County', countyCode: '12086', poaDeadlineDays: 90, proSeDeadlineDays: 90, filingWindowStart: '01-01', filingWindowEnd: '12-31', hasOnlinePortal: true, acceptsEmail: true, acceptsMail: true, acceptsInPerson: true, preferredChannel: 'portal', poaEligible: true },
];

async function seed() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database');
    
    // Clear existing counties
    await connection.query('DELETE FROM counties');
    console.log('Cleared existing counties');
    
    // Insert counties
    for (const county of counties) {
      await connection.query(
        `INSERT INTO counties (state, countyName, countyCode, poaDeadlineDays, proSeDeadlineDays, filingWindowStart, filingWindowEnd, hasOnlinePortal, acceptsEmail, acceptsMail, acceptsInPerson, preferredChannel, poaEligible) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          county.state,
          county.countyName,
          county.countyCode,
          county.poaDeadlineDays,
          county.proSeDeadlineDays,
          county.filingWindowStart,
          county.filingWindowEnd,
          county.hasOnlinePortal ? 1 : 0,
          county.acceptsEmail ? 1 : 0,
          county.acceptsMail ? 1 : 0,
          county.acceptsInPerson ? 1 : 0,
          county.preferredChannel,
          county.poaEligible ? 1 : 0,
        ]
      );
    }
    
    console.log(`Seeded ${counties.length} counties`);
    
    // Verify
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM counties');
    console.log('Total counties in database:', rows[0].count);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seed();
