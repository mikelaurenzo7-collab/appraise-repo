import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    console.log('🔍 Testing full property analysis pipeline...');
    console.log('Address: 914 W Van Buren, Chicago, IL');
    console.log('');
    
    // Submit the address
    const submitResponse = await axios.post('http://localhost:3000/api/trpc/properties.submitAddress', {
      json: {
        address: '914 W Van Buren, Chicago, IL',
        email: 'test@example.com',
        phone: '555-0123',
        filingMethod: 'poa'
      }
    }, { timeout: 30000 });
    
    console.log('Raw response:', JSON.stringify(submitResponse.data, null, 2));
    
    const result = submitResponse.data?.result?.data?.json;
    if (!result || !result.submissionId) {
      console.log('ERROR: No submission ID found');
      process.exit(1);
    }
    
    console.log('✓ SUBMISSION CREATED');
    console.log('  Submission ID:', result.submissionId);
    console.log('');
    
    // Wait a bit for analysis to start
    console.log('⏳ Waiting for analysis to process...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Fetch the submission to see analysis results
    const getResponse = await axios.post('http://localhost:3000/api/trpc/properties.getSubmission', {
      json: { submissionId: result.submissionId }
    }, { timeout: 15000 });
    
    const submission = getResponse.data?.result?.data?.json;
    if (!submission) {
      console.log('ERROR: Could not fetch submission');
      process.exit(1);
    }
    
    console.log('✓ SUBMISSION RETRIEVED');
    console.log('');
    console.log('📊 Analysis Results:');
    console.log('  Status:', submission.status);
    console.log('  Address:', submission.address);
    console.log('  City:', submission.city);
    console.log('  State:', submission.state);
    
    if (submission.analysisData) {
      const data = JSON.parse(submission.analysisData);
      console.log('');
      console.log('💰 Valuation:');
      console.log('  Assessed Value:', data.assessedValue);
      console.log('  Tax Value:', data.taxValue);
      console.log('  Market Value:', data.marketValue);
      console.log('');
      console.log('🏠 Property Details:');
      console.log('  Type:', data.propertyType);
      console.log('  Beds/Baths:', data.bedrooms, '/', data.bathrooms);
      console.log('  Year Built:', data.yearBuilt);
      console.log('  Lot Size:', data.lotSize);
      console.log('');
      console.log('📋 Zoning & Admin:');
      console.log('  Zoning:', data.zoning);
      console.log('  County:', data.county);
      console.log('  Parcel ID:', data.parcelId);
    } else {
      console.log('  (Analysis still processing...)');
    }
    
    console.log('');
    console.log('✓ PIPELINE TEST COMPLETE');
    process.exit(0);
  } catch (err) {
    console.log('ERROR:', err.message);
    if (err.response?.data) console.log('Response:', JSON.stringify(err.response.data, null, 2));
    process.exit(1);
  }
})();
