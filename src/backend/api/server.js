import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Mock data - 20 synthetic leases with complete dataset
const contracts = [
  { id: 1, reportingRegion: "Americas", country: "United States", region: "Americas", city: "San Jose", propertyName: "Silicon Valley Tech Center", propertyId: "US-SV-001", address: "3000 Tasman Drive, San Jose, CA 95134", sqft: 180000, annualRent: 5400000, monthlyRent: 450000, pricePerSqft: 30.00, type: "Office", leaseStartDate: "2020-01-15", leaseEndDate: "2030-01-14", leaseTerm: 10, landlord: "Silicon Valley Properties LLC", renewalOptions: "2x5 years", securityDeposit: 900000, lat: 37.4025, lng: -121.9442 },
  { id: 2, reportingRegion: "Americas", country: "United States", region: "Americas", city: "Austin", propertyName: "Austin Innovation Campus", propertyId: "US-AUS-002", address: "1400 E Parmer Ln, Austin, TX 78753", sqft: 150000, annualRent: 3360000, monthlyRent: 280000, pricePerSqft: 22.40, type: "Lab/R&D", leaseStartDate: "2019-06-01", leaseEndDate: "2029-05-31", leaseTerm: 10, landlord: "Austin Development Corp", renewalOptions: "3x5 years", securityDeposit: 560000, lat: 30.4005, lng: -97.7263 },
  { id: 3, reportingRegion: "Americas", country: "United States", region: "Americas", city: "Phoenix", propertyName: "Desert Sky Industrial Park", propertyId: "US-PHX-003", address: "4850 W Elliot Rd, Phoenix, AZ 85339", sqft: 250000, annualRent: 3840000, monthlyRent: 320000, pricePerSqft: 15.36, type: "Factory", leaseStartDate: "2018-03-01", leaseEndDate: "2033-02-28", leaseTerm: 15, landlord: "Desert Industrial Holdings", renewalOptions: "2x10 years", securityDeposit: 640000, lat: 33.3062, lng: -112.1813 },
  { id: 4, reportingRegion: "Americas", country: "United States", region: "Americas", city: "Portland", propertyName: "Columbia River Distribution Hub", propertyId: "US-PDX-004", address: "11500 NE Marine Dr, Portland, OR 97220", sqft: 120000, annualRent: 1020000, monthlyRent: 85000, pricePerSqft: 8.50, type: "Distribution", leaseStartDate: "2021-09-01", leaseEndDate: "2031-08-31", leaseTerm: 10, landlord: "Columbia Logistics Partners", renewalOptions: "1x5 years", securityDeposit: 170000, lat: 45.5898, lng: -122.5951 },
  { id: 5, reportingRegion: "Americas", country: "United States", region: "Americas", city: "Cambridge", propertyName: "Kendall Square Innovation Center", propertyId: "US-CAM-005", address: "1 Broadway, Cambridge, MA 02142", sqft: 55000, annualRent: 2520000, monthlyRent: 210000, pricePerSqft: 45.82, type: "Lab/R&D", leaseStartDate: "2022-01-01", leaseEndDate: "2032-12-31", leaseTerm: 11, landlord: "MIT Real Estate", renewalOptions: "2x5 years", securityDeposit: 420000, lat: 42.3625, lng: -71.0890 },
  { id: 6, reportingRegion: "Americas", country: "United States", region: "Americas", city: "New York", propertyName: "Park Avenue Tower", propertyId: "US-NYC-006", address: "65 E 55th St, New York, NY 10022", sqft: 22000, annualRent: 1740000, monthlyRent: 145000, pricePerSqft: 79.09, type: "Office", leaseStartDate: "2021-03-15", leaseEndDate: "2026-03-14", leaseTerm: 5, landlord: "Park Avenue Holdings", renewalOptions: "1x3 years", securityDeposit: 290000, lat: 40.7614, lng: -73.9722 },
  { id: 7, reportingRegion: "Americas", country: "United States", region: "Americas", city: "Dallas", propertyName: "DFW Logistics Center", propertyId: "US-DFW-007", address: "2950 Regent Blvd, Irving, TX 75063", sqft: 95000, annualRent: 816000, monthlyRent: 68000, pricePerSqft: 8.59, type: "Warehouse", leaseStartDate: "2020-07-01", leaseEndDate: "2030-06-30", leaseTerm: 10, landlord: "DFW Industrial Group", renewalOptions: "2x5 years", securityDeposit: 136000, lat: 32.6722, lng: -96.9028 },
  { id: 8, reportingRegion: "Asia Pacific", country: "Taiwan", region: "Asia Pacific", city: "Taipei", propertyName: "Taipei 101 Business Center", propertyId: "TW-TPE-008", address: "No. 7, Section 5, Xinyi Road, Taipei 110", sqft: 85000, annualRent: 2220000, monthlyRent: 185000, pricePerSqft: 26.12, type: "Office", leaseStartDate: "2019-04-01", leaseEndDate: "2029-03-31", leaseTerm: 10, landlord: "Taipei Financial Center Corp", renewalOptions: "2x5 years", securityDeposit: 370000, lat: 25.0340, lng: 121.5645 },
  { id: 9, reportingRegion: "Asia Pacific", country: "Taiwan", region: "Asia Pacific", city: "Hsinchu", propertyName: "Hsinchu Science Park - Fab 5", propertyId: "TW-HSC-009", address: "No. 2, Li-Hsin Rd., Hsinchu Science Park", sqft: 320000, annualRent: 6600000, monthlyRent: 550000, pricePerSqft: 20.63, type: "Factory", leaseStartDate: "2017-10-01", leaseEndDate: "2037-09-30", leaseTerm: 20, landlord: "Hsinchu Science Park Administration", renewalOptions: "1x10 years", securityDeposit: 1100000, lat: 24.7807, lng: 120.9972 },
  { id: 10, reportingRegion: "Asia Pacific", country: "South Korea", region: "Asia Pacific", city: "Seoul", propertyName: "Gangnam Tech Valley", propertyId: "KR-SEL-010", address: "Teheran-ro 152, Gangnam-gu, Seoul", sqft: 72000, annualRent: 1980000, monthlyRent: 165000, pricePerSqft: 27.50, type: "Lab/R&D", leaseStartDate: "2020-05-01", leaseEndDate: "2030-04-30", leaseTerm: 10, landlord: "Gangnam Development Corp", renewalOptions: "2x5 years", securityDeposit: 330000, lat: 37.5048, lng: 127.0449 },
  { id: 11, reportingRegion: "Asia Pacific", country: "Japan", region: "Asia Pacific", city: "Tokyo", propertyName: "Shibuya Scramble Square", propertyId: "JP-TYO-011", address: "2-24-12 Shibuya, Shibuya-ku, Tokyo", sqft: 48000, annualRent: 2340000, monthlyRent: 195000, pricePerSqft: 48.75, type: "Office", leaseStartDate: "2021-11-01", leaseEndDate: "2026-10-31", leaseTerm: 5, landlord: "Tokyu Corporation", renewalOptions: "1x5 years", securityDeposit: 390000, lat: 35.6584, lng: 139.7016 },
  { id: 12, reportingRegion: "Asia Pacific", country: "China", region: "Asia Pacific", city: "Shanghai", propertyName: "Zhangjiang Hi-Tech Park Fab 3", propertyId: "CN-SHA-012", address: "No. 498 Guoshoujing Rd, Pudong, Shanghai", sqft: 280000, annualRent: 5040000, monthlyRent: 420000, pricePerSqft: 18.00, type: "Factory", leaseStartDate: "2018-08-01", leaseEndDate: "2038-07-31", leaseTerm: 20, landlord: "Shanghai Zhangjiang Group", renewalOptions: "1x10 years", securityDeposit: 840000, lat: 31.2070, lng: 121.6132 },
  { id: 13, reportingRegion: "Asia Pacific", country: "China", region: "Asia Pacific", city: "Beijing", propertyName: "China World Trade Center", propertyId: "CN-BEJ-013", address: "No. 1 Jianguomenwai Ave, Chaoyang, Beijing", sqft: 62000, annualRent: 1620000, monthlyRent: 135000, pricePerSqft: 26.13, type: "Office", leaseStartDate: "2020-02-01", leaseEndDate: "2027-01-31", leaseTerm: 7, landlord: "China World Trade Center", renewalOptions: "2x3 years", securityDeposit: 270000, lat: 39.9104, lng: 116.4601 },
  { id: 14, reportingRegion: "Asia Pacific", country: "Singapore", region: "Asia Pacific", city: "Singapore", propertyName: "Marina Bay Financial Centre", propertyId: "SG-SIN-014", address: "10 Marina Boulevard, Singapore 018983", sqft: 68000, annualRent: 2700000, monthlyRent: 225000, pricePerSqft: 39.71, type: "Office", leaseStartDate: "2019-12-01", leaseEndDate: "2026-11-30", leaseTerm: 7, landlord: "Raffles Quay Asset Management", renewalOptions: "2x3 years", securityDeposit: 450000, lat: 1.2806, lng: 103.8540 },
  { id: 15, reportingRegion: "Asia Pacific", country: "India", region: "Asia Pacific", city: "Bangalore", propertyName: "Electronic City Tech Park", propertyId: "IN-BLR-015", address: "Electronic City Phase 1, Bangalore 560100", sqft: 95000, annualRent: 900000, monthlyRent: 75000, pricePerSqft: 9.47, type: "Lab/R&D", leaseStartDate: "2021-04-01", leaseEndDate: "2031-03-31", leaseTerm: 10, landlord: "KIADB Electronic City", renewalOptions: "2x5 years", securityDeposit: 150000, lat: 12.8456, lng: 77.6603 },
  { id: 16, reportingRegion: "Asia Pacific", country: "Malaysia", region: "Asia Pacific", city: "Penang", propertyName: "Bayan Lepas Industrial Park", propertyId: "MY-PEN-016", address: "Phase 4, Bayan Lepas, Penang 11900", sqft: 165000, annualRent: 1140000, monthlyRent: 95000, pricePerSqft: 6.91, type: "Factory", leaseStartDate: "2019-01-01", leaseEndDate: "2034-12-31", leaseTerm: 16, landlord: "Penang Development Corp", renewalOptions: "1x10 years", securityDeposit: 190000, lat: 5.3126, lng: 100.2681 },
  { id: 17, reportingRegion: "Asia Pacific", country: "Vietnam", region: "Asia Pacific", city: "Ho Chi Minh City", propertyName: "Saigon Hi-Tech Park - Building 7", propertyId: "VN-SGN-017", address: "Xa Lo Ha Noi, Thu Duc District, HCMC", sqft: 88000, annualRent: 744000, monthlyRent: 62000, pricePerSqft: 8.45, type: "Lab/R&D", leaseStartDate: "2020-08-01", leaseEndDate: "2030-07-31", leaseTerm: 10, landlord: "Saigon Hi-Tech Park Management", renewalOptions: "2x5 years", securityDeposit: 124000, lat: 10.8544, lng: 106.7583 },
  { id: 18, reportingRegion: "Europe", country: "Germany", region: "Europe", city: "Munich", propertyName: "Highlight Towers", propertyId: "DE-MUC-018", address: "Mies-van-der-Rohe-Straße 6, 80807 Munich", sqft: 52000, annualRent: 1860000, monthlyRent: 155000, pricePerSqft: 35.77, type: "Lab/R&D", leaseStartDate: "2021-02-01", leaseEndDate: "2028-01-31", leaseTerm: 7, landlord: "Highlight Towers GmbH", renewalOptions: "2x3 years", securityDeposit: 310000, lat: 48.1771, lng: 11.5753 },
  { id: 19, reportingRegion: "Europe", country: "Ireland", region: "Europe", city: "Dublin", propertyName: "Silicon Docks Corporate Center", propertyId: "IE-DUB-019", address: "Grand Canal Dock, Dublin D02", sqft: 42000, annualRent: 1536000, monthlyRent: 128000, pricePerSqft: 36.57, type: "Office", leaseStartDate: "2020-10-01", leaseEndDate: "2027-09-30", leaseTerm: 7, landlord: "Dublin Docklands Development", renewalOptions: "1x5 years", securityDeposit: 256000, lat: 53.3424, lng: -6.2394 },
  { id: 20, reportingRegion: "Europe", country: "United Kingdom", region: "Europe", city: "London", propertyName: "The Shard", propertyId: "UK-LON-020", address: "32 London Bridge St, London SE1 9SG", sqft: 28000, annualRent: 2220000, monthlyRent: 185000, pricePerSqft: 79.29, type: "Office", leaseStartDate: "2022-03-01", leaseEndDate: "2027-02-28", leaseTerm: 5, landlord: "Sellar Property Group", renewalOptions: "1x3 years", securityDeposit: 370000, lat: 51.5045, lng: -0.0865 }
];

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RECC API is running' });
});

app.get('/api/contracts', (req, res) => {
  res.json(contracts);
});

app.get('/api/contracts/:id', (req, res) => {
  const contract = contracts.find(c => c.id === parseInt(req.params.id));
  if (contract) {
    res.json(contract);
  } else {
    res.status(404).json({ error: 'Contract not found' });
  }
});

app.get('/api/stats', (req, res) => {
  const stats = {
    totalContracts: contracts.length,
    totalSqft: contracts.reduce((sum, c) => sum + c.sqft, 0),
    totalAnnualRent: contracts.reduce((sum, c) => sum + c.annualRent, 0),
    avgPricePerSqft: (contracts.reduce((sum, c) => sum + c.pricePerSqft, 0) / contracts.length).toFixed(2),
    byRegion: {
      'Americas': contracts.filter(c => c.region === 'Americas').length,
      'Asia Pacific': contracts.filter(c => c.region === 'Asia Pacific').length,
      'Europe': contracts.filter(c => c.region === 'Europe').length
    },
    byType: contracts.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {})
  };
  res.json(stats);
});

app.listen(port, () => {
  console.log(`🚀 RECC API Server running on http://localhost:${port}`);
  console.log(`📊 Mock data loaded: ${contracts.length} contracts`);
  console.log(`💡 Try: http://localhost:${port}/api/contracts`);
});
