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

// 200+ high-population counties covering all 50 states + DC
const counties = [
  // ALABAMA
  { state: 'AL', countyName: 'Jefferson County', countyCode: '01073', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'AL', countyName: 'Mobile County', countyCode: '01097', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'AL', countyName: 'Madison County', countyCode: '01089', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'AL', countyName: 'Baldwin County', countyCode: '01003', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // ALASKA
  { state: 'AK', countyName: 'Anchorage Borough', countyCode: '02020', poa: 30, proSe: 30, ws: '01-15', we: '04-15', ch: 'mail_certified' },
  { state: 'AK', countyName: 'Fairbanks North Star Borough', countyCode: '02090', poa: 30, proSe: 30, ws: '01-15', we: '04-15', ch: 'mail_certified' },
  { state: 'AK', countyName: 'Matanuska-Susitna Borough', countyCode: '02170', poa: 30, proSe: 30, ws: '01-15', we: '04-15', ch: 'mail_certified' },
  // ARIZONA
  { state: 'AZ', countyName: 'Maricopa County', countyCode: '04013', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'portal', portal: true, eligible: true },
  { state: 'AZ', countyName: 'Pima County', countyCode: '04019', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'AZ', countyName: 'Pinal County', countyCode: '04021', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'AZ', countyName: 'Yavapai County', countyCode: '04025', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // ARKANSAS
  { state: 'AR', countyName: 'Pulaski County', countyCode: '05119', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'AR', countyName: 'Benton County', countyCode: '05007', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'AR', countyName: 'Washington County', countyCode: '05143', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // CALIFORNIA
  { state: 'CA', countyName: 'Los Angeles County', countyCode: '06037', poa: 60, proSe: 60, ws: '07-02', we: '11-30', ch: 'portal', portal: true, eligible: true },
  { state: 'CA', countyName: 'San Diego County', countyCode: '06073', poa: 60, proSe: 60, ws: '07-02', we: '11-30', ch: 'portal', portal: true },
  { state: 'CA', countyName: 'Orange County', countyCode: '06059', poa: 60, proSe: 60, ws: '07-02', we: '11-30', ch: 'portal', portal: true },
  { state: 'CA', countyName: 'Riverside County', countyCode: '06065', poa: 60, proSe: 60, ws: '07-02', we: '11-30', ch: 'mail_certified' },
  { state: 'CA', countyName: 'San Bernardino County', countyCode: '06071', poa: 60, proSe: 60, ws: '07-02', we: '11-30', ch: 'mail_certified' },
  { state: 'CA', countyName: 'Santa Clara County', countyCode: '06085', poa: 60, proSe: 60, ws: '07-02', we: '11-30', ch: 'portal', portal: true },
  { state: 'CA', countyName: 'Alameda County', countyCode: '06001', poa: 60, proSe: 60, ws: '07-02', we: '11-30', ch: 'mail_certified' },
  { state: 'CA', countyName: 'Sacramento County', countyCode: '06067', poa: 60, proSe: 60, ws: '07-02', we: '11-30', ch: 'mail_certified' },
  // COLORADO
  { state: 'CO', countyName: 'Denver County', countyCode: '08031', poa: 45, proSe: 45, ws: '05-01', we: '06-01', ch: 'portal', portal: true },
  { state: 'CO', countyName: 'El Paso County', countyCode: '08041', poa: 45, proSe: 45, ws: '05-01', we: '06-01', ch: 'mail_certified' },
  { state: 'CO', countyName: 'Arapahoe County', countyCode: '08005', poa: 45, proSe: 45, ws: '05-01', we: '06-01', ch: 'mail_certified' },
  { state: 'CO', countyName: 'Jefferson County', countyCode: '08059', poa: 45, proSe: 45, ws: '05-01', we: '06-01', ch: 'mail_certified' },
  { state: 'CO', countyName: 'Adams County', countyCode: '08001', poa: 45, proSe: 45, ws: '05-01', we: '06-01', ch: 'mail_certified' },
  // CONNECTICUT
  { state: 'CT', countyName: 'Fairfield County', countyCode: '09001', poa: 45, proSe: 45, ws: '02-01', we: '03-20', ch: 'mail_certified' },
  { state: 'CT', countyName: 'Hartford County', countyCode: '09003', poa: 45, proSe: 45, ws: '02-01', we: '03-20', ch: 'mail_certified' },
  { state: 'CT', countyName: 'New Haven County', countyCode: '09009', poa: 45, proSe: 45, ws: '02-01', we: '03-20', ch: 'mail_certified' },
  // DELAWARE
  { state: 'DE', countyName: 'New Castle County', countyCode: '10003', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'DE', countyName: 'Sussex County', countyCode: '10005', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'DE', countyName: 'Kent County', countyCode: '10001', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // DISTRICT OF COLUMBIA
  { state: 'DC', countyName: 'District of Columbia', countyCode: '11001', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'portal', portal: true },
  // FLORIDA
  { state: 'FL', countyName: 'Miami-Dade County', countyCode: '12086', poa: 25, proSe: 25, ws: '08-01', we: '09-15', ch: 'portal', portal: true, eligible: true },
  { state: 'FL', countyName: 'Broward County', countyCode: '12011', poa: 25, proSe: 25, ws: '08-01', we: '09-15', ch: 'portal', portal: true },
  { state: 'FL', countyName: 'Palm Beach County', countyCode: '12099', poa: 25, proSe: 25, ws: '08-01', we: '09-15', ch: 'mail_certified' },
  { state: 'FL', countyName: 'Hillsborough County', countyCode: '12057', poa: 25, proSe: 25, ws: '08-01', we: '09-15', ch: 'mail_certified' },
  { state: 'FL', countyName: 'Orange County', countyCode: '12095', poa: 25, proSe: 25, ws: '08-01', we: '09-15', ch: 'mail_certified' },
  { state: 'FL', countyName: 'Duval County', countyCode: '12031', poa: 25, proSe: 25, ws: '08-01', we: '09-15', ch: 'mail_certified' },
  { state: 'FL', countyName: 'Pinellas County', countyCode: '12103', poa: 25, proSe: 25, ws: '08-01', we: '09-15', ch: 'mail_certified' },
  // GEORGIA
  { state: 'GA', countyName: 'Fulton County', countyCode: '13121', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'portal', portal: true },
  { state: 'GA', countyName: 'Gwinnett County', countyCode: '13135', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'GA', countyName: 'Cobb County', countyCode: '13067', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'GA', countyName: 'DeKalb County', countyCode: '13089', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // HAWAII
  { state: 'HI', countyName: 'Honolulu County', countyCode: '15003', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'HI', countyName: 'Hawaii County', countyCode: '15001', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'HI', countyName: 'Maui County', countyCode: '15009', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // IDAHO
  { state: 'ID', countyName: 'Ada County', countyCode: '16001', poa: 60, proSe: 60, ws: '01-01', we: '06-20', ch: 'mail_certified' },
  { state: 'ID', countyName: 'Canyon County', countyCode: '16027', poa: 60, proSe: 60, ws: '01-01', we: '06-20', ch: 'mail_certified' },
  { state: 'ID', countyName: 'Kootenai County', countyCode: '16055', poa: 60, proSe: 60, ws: '01-01', we: '06-20', ch: 'mail_certified' },
  // ILLINOIS
  { state: 'IL', countyName: 'Cook County', countyCode: '17031', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'portal', portal: true, eligible: true },
  { state: 'IL', countyName: 'DuPage County', countyCode: '17043', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'portal', portal: true },
  { state: 'IL', countyName: 'Lake County', countyCode: '17097', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'IL', countyName: 'Will County', countyCode: '17197', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'IL', countyName: 'Kane County', countyCode: '17089', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // INDIANA
  { state: 'IN', countyName: 'Marion County', countyCode: '18097', poa: 45, proSe: 45, ws: '06-01', we: '06-15', ch: 'mail_certified' },
  { state: 'IN', countyName: 'Lake County', countyCode: '18089', poa: 45, proSe: 45, ws: '06-01', we: '06-15', ch: 'mail_certified' },
  { state: 'IN', countyName: 'Allen County', countyCode: '18003', poa: 45, proSe: 45, ws: '06-01', we: '06-15', ch: 'mail_certified' },
  { state: 'IN', countyName: 'Hamilton County', countyCode: '18057', poa: 45, proSe: 45, ws: '06-01', we: '06-15', ch: 'mail_certified' },
  // IOWA
  { state: 'IA', countyName: 'Polk County', countyCode: '19153', poa: 45, proSe: 45, ws: '04-02', we: '04-30', ch: 'mail_certified' },
  { state: 'IA', countyName: 'Linn County', countyCode: '19113', poa: 45, proSe: 45, ws: '04-02', we: '04-30', ch: 'mail_certified' },
  { state: 'IA', countyName: 'Scott County', countyCode: '19163', poa: 45, proSe: 45, ws: '04-02', we: '04-30', ch: 'mail_certified' },
  // KANSAS
  { state: 'KS', countyName: 'Johnson County', countyCode: '20091', poa: 30, proSe: 30, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'KS', countyName: 'Sedgwick County', countyCode: '20173', poa: 30, proSe: 30, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'KS', countyName: 'Shawnee County', countyCode: '20177', poa: 30, proSe: 30, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // KENTUCKY
  { state: 'KY', countyName: 'Jefferson County', countyCode: '21111', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'KY', countyName: 'Fayette County', countyCode: '21067', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'KY', countyName: 'Kenton County', countyCode: '21117', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // LOUISIANA
  { state: 'LA', countyName: 'East Baton Rouge Parish', countyCode: '22033', poa: 45, proSe: 45, ws: '08-01', we: '09-15', ch: 'mail_certified' },
  { state: 'LA', countyName: 'Jefferson Parish', countyCode: '22051', poa: 45, proSe: 45, ws: '08-01', we: '09-15', ch: 'mail_certified' },
  { state: 'LA', countyName: 'Orleans Parish', countyCode: '22071', poa: 45, proSe: 45, ws: '08-01', we: '09-15', ch: 'mail_certified' },
  { state: 'LA', countyName: 'St. Tammany Parish', countyCode: '22103', poa: 45, proSe: 45, ws: '08-01', we: '09-15', ch: 'mail_certified' },
  // MAINE
  { state: 'ME', countyName: 'Cumberland County', countyCode: '23005', poa: 60, proSe: 60, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  { state: 'ME', countyName: 'York County', countyCode: '23031', poa: 60, proSe: 60, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  { state: 'ME', countyName: 'Penobscot County', countyCode: '23019', poa: 60, proSe: 60, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  // MARYLAND
  { state: 'MD', countyName: 'Montgomery County', countyCode: '24031', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'MD', countyName: "Prince George's County", countyCode: '24033', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'MD', countyName: 'Baltimore County', countyCode: '24005', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'MD', countyName: 'Anne Arundel County', countyCode: '24003', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // MASSACHUSETTS
  { state: 'MA', countyName: 'Middlesex County', countyCode: '25017', poa: 90, proSe: 90, ws: '02-01', we: '02-01', ch: 'mail_certified' },
  { state: 'MA', countyName: 'Suffolk County', countyCode: '25025', poa: 90, proSe: 90, ws: '02-01', we: '02-01', ch: 'mail_certified' },
  { state: 'MA', countyName: 'Worcester County', countyCode: '25027', poa: 90, proSe: 90, ws: '02-01', we: '02-01', ch: 'mail_certified' },
  { state: 'MA', countyName: 'Essex County', countyCode: '25009', poa: 90, proSe: 90, ws: '02-01', we: '02-01', ch: 'mail_certified' },
  { state: 'MA', countyName: 'Norfolk County', countyCode: '25021', poa: 90, proSe: 90, ws: '02-01', we: '02-01', ch: 'mail_certified' },
  // MICHIGAN
  { state: 'MI', countyName: 'Wayne County', countyCode: '26163', poa: 35, proSe: 35, ws: '03-01', we: '03-31', ch: 'mail_certified' },
  { state: 'MI', countyName: 'Oakland County', countyCode: '26125', poa: 35, proSe: 35, ws: '03-01', we: '03-31', ch: 'mail_certified' },
  { state: 'MI', countyName: 'Macomb County', countyCode: '26099', poa: 35, proSe: 35, ws: '03-01', we: '03-31', ch: 'mail_certified' },
  { state: 'MI', countyName: 'Kent County', countyCode: '26081', poa: 35, proSe: 35, ws: '03-01', we: '03-31', ch: 'mail_certified' },
  { state: 'MI', countyName: 'Washtenaw County', countyCode: '26161', poa: 35, proSe: 35, ws: '03-01', we: '03-31', ch: 'mail_certified' },
  // MINNESOTA
  { state: 'MN', countyName: 'Hennepin County', countyCode: '27053', poa: 60, proSe: 60, ws: '04-01', we: '04-30', ch: 'mail_certified' },
  { state: 'MN', countyName: 'Ramsey County', countyCode: '27123', poa: 60, proSe: 60, ws: '04-01', we: '04-30', ch: 'mail_certified' },
  { state: 'MN', countyName: 'Dakota County', countyCode: '27037', poa: 60, proSe: 60, ws: '04-01', we: '04-30', ch: 'mail_certified' },
  { state: 'MN', countyName: 'Anoka County', countyCode: '27003', poa: 60, proSe: 60, ws: '04-01', we: '04-30', ch: 'mail_certified' },
  // MISSISSIPPI
  { state: 'MS', countyName: 'Hinds County', countyCode: '28049', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'MS', countyName: 'Harrison County', countyCode: '28047', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'MS', countyName: 'DeSoto County', countyCode: '28033', poa: 45, proSe: 45, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // MISSOURI
  { state: 'MO', countyName: 'St. Louis County', countyCode: '29189', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'MO', countyName: 'Jackson County', countyCode: '29095', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'MO', countyName: 'St. Charles County', countyCode: '29183', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'MO', countyName: 'Greene County', countyCode: '29077', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // MONTANA
  { state: 'MT', countyName: 'Yellowstone County', countyCode: '30111', poa: 30, proSe: 30, ws: '01-01', we: '06-01', ch: 'mail_certified' },
  { state: 'MT', countyName: 'Missoula County', countyCode: '30063', poa: 30, proSe: 30, ws: '01-01', we: '06-01', ch: 'mail_certified' },
  { state: 'MT', countyName: 'Gallatin County', countyCode: '30031', poa: 30, proSe: 30, ws: '01-01', we: '06-01', ch: 'mail_certified' },
  // NEBRASKA
  { state: 'NE', countyName: 'Douglas County', countyCode: '31055', poa: 30, proSe: 30, ws: '06-01', we: '06-30', ch: 'mail_certified' },
  { state: 'NE', countyName: 'Lancaster County', countyCode: '31109', poa: 30, proSe: 30, ws: '06-01', we: '06-30', ch: 'mail_certified' },
  { state: 'NE', countyName: 'Sarpy County', countyCode: '31153', poa: 30, proSe: 30, ws: '06-01', we: '06-30', ch: 'mail_certified' },
  // NEVADA
  { state: 'NV', countyName: 'Clark County', countyCode: '32003', poa: 45, proSe: 45, ws: '01-15', we: '01-15', ch: 'portal', portal: true },
  { state: 'NV', countyName: 'Washoe County', countyCode: '32031', poa: 45, proSe: 45, ws: '01-15', we: '01-15', ch: 'mail_certified' },
  // NEW HAMPSHIRE
  { state: 'NH', countyName: 'Hillsborough County', countyCode: '33011', poa: 60, proSe: 60, ws: '03-01', we: '09-01', ch: 'mail_certified' },
  { state: 'NH', countyName: 'Rockingham County', countyCode: '33015', poa: 60, proSe: 60, ws: '03-01', we: '09-01', ch: 'mail_certified' },
  { state: 'NH', countyName: 'Merrimack County', countyCode: '33013', poa: 60, proSe: 60, ws: '03-01', we: '09-01', ch: 'mail_certified' },
  // NEW JERSEY
  { state: 'NJ', countyName: 'Bergen County', countyCode: '34003', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  { state: 'NJ', countyName: 'Essex County', countyCode: '34013', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  { state: 'NJ', countyName: 'Middlesex County', countyCode: '34023', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  { state: 'NJ', countyName: 'Hudson County', countyCode: '34017', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  { state: 'NJ', countyName: 'Monmouth County', countyCode: '34025', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  { state: 'NJ', countyName: 'Ocean County', countyCode: '34029', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  // NEW MEXICO
  { state: 'NM', countyName: 'Bernalillo County', countyCode: '35001', poa: 30, proSe: 30, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'NM', countyName: 'Dona Ana County', countyCode: '35013', poa: 30, proSe: 30, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'NM', countyName: 'Santa Fe County', countyCode: '35049', poa: 30, proSe: 30, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // NEW YORK
  { state: 'NY', countyName: 'Kings County', countyCode: '36047', poa: 90, proSe: 90, ws: '01-15', we: '03-15', ch: 'portal', portal: true },
  { state: 'NY', countyName: 'Queens County', countyCode: '36081', poa: 90, proSe: 90, ws: '01-15', we: '03-15', ch: 'portal', portal: true },
  { state: 'NY', countyName: 'New York County', countyCode: '36061', poa: 90, proSe: 90, ws: '01-15', we: '03-15', ch: 'portal', portal: true },
  { state: 'NY', countyName: 'Suffolk County', countyCode: '36103', poa: 90, proSe: 90, ws: '05-01', we: '05-15', ch: 'mail_certified' },
  { state: 'NY', countyName: 'Nassau County', countyCode: '36059', poa: 90, proSe: 90, ws: '01-02', we: '03-01', ch: 'mail_certified' },
  { state: 'NY', countyName: 'Bronx County', countyCode: '36005', poa: 90, proSe: 90, ws: '01-15', we: '03-15', ch: 'portal', portal: true },
  { state: 'NY', countyName: 'Erie County', countyCode: '36029', poa: 90, proSe: 90, ws: '05-01', we: '05-15', ch: 'mail_certified' },
  { state: 'NY', countyName: 'Westchester County', countyCode: '36119', poa: 90, proSe: 90, ws: '06-01', we: '06-15', ch: 'mail_certified' },
  // NORTH CAROLINA
  { state: 'NC', countyName: 'Mecklenburg County', countyCode: '37119', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'NC', countyName: 'Wake County', countyCode: '37183', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'NC', countyName: 'Guilford County', countyCode: '37081', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'NC', countyName: 'Forsyth County', countyCode: '37067', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // NORTH DAKOTA
  { state: 'ND', countyName: 'Cass County', countyCode: '38017', poa: 45, proSe: 45, ws: '04-01', we: '06-01', ch: 'mail_certified' },
  { state: 'ND', countyName: 'Burleigh County', countyCode: '38015', poa: 45, proSe: 45, ws: '04-01', we: '06-01', ch: 'mail_certified' },
  { state: 'ND', countyName: 'Grand Forks County', countyCode: '38035', poa: 45, proSe: 45, ws: '04-01', we: '06-01', ch: 'mail_certified' },
  // OHIO
  { state: 'OH', countyName: 'Franklin County', countyCode: '39049', poa: 60, proSe: 60, ws: '01-01', we: '03-31', ch: 'mail_certified' },
  { state: 'OH', countyName: 'Cuyahoga County', countyCode: '39035', poa: 60, proSe: 60, ws: '01-01', we: '03-31', ch: 'mail_certified' },
  { state: 'OH', countyName: 'Hamilton County', countyCode: '39061', poa: 60, proSe: 60, ws: '01-01', we: '03-31', ch: 'mail_certified' },
  { state: 'OH', countyName: 'Summit County', countyCode: '39153', poa: 60, proSe: 60, ws: '01-01', we: '03-31', ch: 'mail_certified' },
  { state: 'OH', countyName: 'Montgomery County', countyCode: '39113', poa: 60, proSe: 60, ws: '01-01', we: '03-31', ch: 'mail_certified' },
  // OKLAHOMA
  { state: 'OK', countyName: 'Oklahoma County', countyCode: '40109', poa: 30, proSe: 30, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'OK', countyName: 'Tulsa County', countyCode: '40143', poa: 30, proSe: 30, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'OK', countyName: 'Cleveland County', countyCode: '40027', poa: 30, proSe: 30, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // OREGON
  { state: 'OR', countyName: 'Multnomah County', countyCode: '41051', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'OR', countyName: 'Washington County', countyCode: '41067', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'OR', countyName: 'Clackamas County', countyCode: '41005', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'OR', countyName: 'Lane County', countyCode: '41039', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // PENNSYLVANIA
  { state: 'PA', countyName: 'Philadelphia County', countyCode: '42101', poa: 60, proSe: 60, ws: '10-01', we: '10-07', ch: 'mail_certified' },
  { state: 'PA', countyName: 'Allegheny County', countyCode: '42003', poa: 60, proSe: 60, ws: '01-01', we: '03-31', ch: 'mail_certified' },
  { state: 'PA', countyName: 'Montgomery County', countyCode: '42091', poa: 60, proSe: 60, ws: '08-01', we: '09-01', ch: 'mail_certified' },
  { state: 'PA', countyName: 'Bucks County', countyCode: '42017', poa: 60, proSe: 60, ws: '08-01', we: '09-01', ch: 'mail_certified' },
  { state: 'PA', countyName: 'Delaware County', countyCode: '42045', poa: 60, proSe: 60, ws: '08-01', we: '09-01', ch: 'mail_certified' },
  // RHODE ISLAND
  { state: 'RI', countyName: 'Providence County', countyCode: '44007', poa: 90, proSe: 90, ws: '12-15', we: '12-15', ch: 'mail_certified' },
  { state: 'RI', countyName: 'Kent County', countyCode: '44003', poa: 90, proSe: 90, ws: '12-15', we: '12-15', ch: 'mail_certified' },
  // SOUTH CAROLINA
  { state: 'SC', countyName: 'Greenville County', countyCode: '45045', poa: 90, proSe: 90, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'SC', countyName: 'Richland County', countyCode: '45079', poa: 90, proSe: 90, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'SC', countyName: 'Charleston County', countyCode: '45019', poa: 90, proSe: 90, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'SC', countyName: 'Horry County', countyCode: '45051', poa: 90, proSe: 90, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // SOUTH DAKOTA
  { state: 'SD', countyName: 'Minnehaha County', countyCode: '46099', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  { state: 'SD', countyName: 'Pennington County', countyCode: '46103', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  { state: 'SD', countyName: 'Lincoln County', countyCode: '46083', poa: 45, proSe: 45, ws: '04-01', we: '04-01', ch: 'mail_certified' },
  // TENNESSEE
  { state: 'TN', countyName: 'Shelby County', countyCode: '47157', poa: 45, proSe: 45, ws: '06-01', we: '08-01', ch: 'mail_certified' },
  { state: 'TN', countyName: 'Davidson County', countyCode: '47037', poa: 45, proSe: 45, ws: '06-01', we: '08-01', ch: 'mail_certified' },
  { state: 'TN', countyName: 'Knox County', countyCode: '47093', poa: 45, proSe: 45, ws: '06-01', we: '08-01', ch: 'mail_certified' },
  { state: 'TN', countyName: 'Hamilton County', countyCode: '47065', poa: 45, proSe: 45, ws: '06-01', we: '08-01', ch: 'mail_certified' },
  // TEXAS
  { state: 'TX', countyName: 'Harris County', countyCode: '48201', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true, eligible: true },
  { state: 'TX', countyName: 'Dallas County', countyCode: '48113', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true, eligible: true },
  { state: 'TX', countyName: 'Tarrant County', countyCode: '48439', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true, eligible: true },
  { state: 'TX', countyName: 'Bexar County', countyCode: '48029', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true, eligible: true },
  { state: 'TX', countyName: 'Travis County', countyCode: '48453', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true, eligible: true },
  { state: 'TX', countyName: 'Collin County', countyCode: '48085', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true },
  { state: 'TX', countyName: 'Denton County', countyCode: '48121', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true },
  { state: 'TX', countyName: 'Fort Bend County', countyCode: '48157', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true },
  { state: 'TX', countyName: 'Williamson County', countyCode: '48491', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true },
  { state: 'TX', countyName: 'Montgomery County', countyCode: '48339', poa: 90, proSe: 90, ws: '01-01', we: '05-15', ch: 'portal', portal: true },
  // UTAH
  { state: 'UT', countyName: 'Salt Lake County', countyCode: '49035', poa: 45, proSe: 45, ws: '09-15', we: '11-15', ch: 'mail_certified' },
  { state: 'UT', countyName: 'Utah County', countyCode: '49049', poa: 45, proSe: 45, ws: '09-15', we: '11-15', ch: 'mail_certified' },
  { state: 'UT', countyName: 'Davis County', countyCode: '49011', poa: 45, proSe: 45, ws: '09-15', we: '11-15', ch: 'mail_certified' },
  { state: 'UT', countyName: 'Weber County', countyCode: '49057', poa: 45, proSe: 45, ws: '09-15', we: '11-15', ch: 'mail_certified' },
  // VERMONT
  { state: 'VT', countyName: 'Chittenden County', countyCode: '50007', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'VT', countyName: 'Rutland County', countyCode: '50021', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'VT', countyName: 'Washington County', countyCode: '50023', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // VIRGINIA
  { state: 'VA', countyName: 'Fairfax County', countyCode: '51059', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'VA', countyName: 'Prince William County', countyCode: '51153', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'VA', countyName: 'Loudoun County', countyCode: '51107', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'VA', countyName: 'Chesterfield County', countyCode: '51041', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  { state: 'VA', countyName: 'Henrico County', countyCode: '51087', poa: 60, proSe: 60, ws: '01-01', we: '12-31', ch: 'mail_certified' },
  // WASHINGTON
  { state: 'WA', countyName: 'King County', countyCode: '53033', poa: 60, proSe: 60, ws: '07-01', we: '07-01', ch: 'portal', portal: true },
  { state: 'WA', countyName: 'Pierce County', countyCode: '53053', poa: 60, proSe: 60, ws: '07-01', we: '07-01', ch: 'mail_certified' },
  { state: 'WA', countyName: 'Snohomish County', countyCode: '53061', poa: 60, proSe: 60, ws: '07-01', we: '07-01', ch: 'mail_certified' },
  { state: 'WA', countyName: 'Clark County', countyCode: '53011', poa: 60, proSe: 60, ws: '07-01', we: '07-01', ch: 'mail_certified' },
  { state: 'WA', countyName: 'Spokane County', countyCode: '53063', poa: 60, proSe: 60, ws: '07-01', we: '07-01', ch: 'mail_certified' },
  // WEST VIRGINIA
  { state: 'WV', countyName: 'Kanawha County', countyCode: '54039', poa: 45, proSe: 45, ws: '02-01', we: '02-28', ch: 'mail_certified' },
  { state: 'WV', countyName: 'Berkeley County', countyCode: '54003', poa: 45, proSe: 45, ws: '02-01', we: '02-28', ch: 'mail_certified' },
  { state: 'WV', countyName: 'Cabell County', countyCode: '54011', poa: 45, proSe: 45, ws: '02-01', we: '02-28', ch: 'mail_certified' },
  // WISCONSIN
  { state: 'WI', countyName: 'Milwaukee County', countyCode: '55079', poa: 45, proSe: 45, ws: '01-01', we: '01-31', ch: 'mail_certified' },
  { state: 'WI', countyName: 'Dane County', countyCode: '55025', poa: 45, proSe: 45, ws: '01-01', we: '01-31', ch: 'mail_certified' },
  { state: 'WI', countyName: 'Waukesha County', countyCode: '55133', poa: 45, proSe: 45, ws: '01-01', we: '01-31', ch: 'mail_certified' },
  { state: 'WI', countyName: 'Brown County', countyCode: '55009', poa: 45, proSe: 45, ws: '01-01', we: '01-31', ch: 'mail_certified' },
  // WYOMING
  { state: 'WY', countyName: 'Laramie County', countyCode: '56021', poa: 30, proSe: 30, ws: '05-01', we: '06-01', ch: 'mail_certified' },
  { state: 'WY', countyName: 'Natrona County', countyCode: '56025', poa: 30, proSe: 30, ws: '05-01', we: '06-01', ch: 'mail_certified' },
  { state: 'WY', countyName: 'Campbell County', countyCode: '56005', poa: 30, proSe: 30, ws: '05-01', we: '06-01', ch: 'mail_certified' },
];

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.execute('DELETE FROM counties');
    console.log('Cleared existing counties');

    let inserted = 0;
    for (const c of counties) {
      await conn.execute(
        `INSERT INTO counties (state, countyName, countyCode, poaDeadlineDays, proSeDeadlineDays,
         filingWindowStart, filingWindowEnd, hasOnlinePortal, acceptsEmail, acceptsMail, acceptsInPerson,
         preferredChannel, poaEligible, fallbackChannel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?, 'mail_certified')`,
        [
          c.state, c.countyName, c.countyCode, c.poa, c.proSe,
          c.ws, c.we, c.portal ? 1 : 0, c.ch, c.eligible ? 1 : 0,
        ]
      );
      inserted++;
    }

    const [stateRows] = await conn.execute('SELECT COUNT(DISTINCT state) as cnt FROM counties');
    const stateCount = stateRows[0].cnt;
    console.log(`✅ Seeded ${inserted} counties across ${stateCount} states + DC`);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch(console.error);
