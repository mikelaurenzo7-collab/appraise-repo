import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const apiKey = process.env.REDFIN_RAPIDAPI_KEY;
console.log('Key:', apiKey ? apiKey.slice(0, 10) + '...' : 'NOT FOUND');

const REDFIN_RAPIDAPI_HOST = "redfin-com-data.p.rapidapi.com";

async function testAutoComplete(query) {
  try {
    const response = await axios.get(`https://${REDFIN_RAPIDAPI_HOST}/properties/auto-complete`, {
      params: { query },
      headers: {
        "x-rapidapi-host": REDFIN_RAPIDAPI_HOST,
        "x-rapidapi-key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 8000,
    });
    console.log('\n=== Response for:', query, '===');
    console.log('Status:', response.status);
    // Print full structure
    console.log(JSON.stringify(response.data, null, 2).slice(0, 2000));
  } catch (err) {
    console.error('Error:', err.response?.status, err.message);
  }
}

await testAutoComplete('Naperville IL');
