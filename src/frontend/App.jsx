import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  AppBar,
  Toolbar,
  Paper,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Modal,
  Divider,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  Business,
  TrendingUp,
  LocationOn,
  AttachMoney
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';
import MapView from './MapView';
import MapboxView from './MapboxView';
import GlobeView from './GlobeView';
import GlobeViewHex from './GlobeViewHex';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function App() {
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [mapView, setMapView] = useState('hexglobe'); // 'simple', 'mapbox', 'globe', or 'hexglobe'
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContract, setModalContract] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contractsRes, statsRes] = await Promise.all([
        axios.get('http://localhost:3001/api/contracts'),
        axios.get('http://localhost:3001/api/stats')
      ]);

      setContracts(contractsRes.data);
      setStats(statsRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data. Make sure the backend server is running.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error">{error}</Alert>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Start the backend: <code>npm run server</code>
        </Typography>
      </Box>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const regionData = Object.entries(stats.byRegion).map(([name, value]) => ({
    name,
    value
  }));

  const typeData = Object.entries(stats.byType).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
        <Toolbar>
          <Business sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            RECC - Real Estate Contract Center
          </Typography>
          <Chip label="20 Leases" color="secondary" />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Business color="primary" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="h6">
                    Total Leases
                  </Typography>
                </Box>
                <Typography variant="h4">{stats.totalContracts}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Across 11 countries
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <AttachMoney color="success" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="h6">
                    Annual Rent
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {formatCurrency(stats.totalAnnualRent)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total portfolio value
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <LocationOn color="error" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="h6">
                    Total Space
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {formatNumber(stats.totalSqft)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Square feet
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <TrendingUp color="warning" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="h6">
                    Avg Price/SqFt
                  </Typography>
                </Box>
                <Typography variant="h4">${stats.avgPricePerSqft}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Portfolio average
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Map and Charts */}
        <Grid container spacing={3}>
          {/* Map */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 2, height: '600px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Global Portfolio Map
                </Typography>
                <ToggleButtonGroup
                  value={mapView}
                  exclusive
                  onChange={(e, newView) => newView && setMapView(newView)}
                  size="small"
                >
                  <ToggleButton value="mapbox">Mapbox</ToggleButton>
                  <ToggleButton value="globe">3D Points</ToggleButton>
                  <ToggleButton value="hexglobe">3D Hexagons</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              {mapView === 'mapbox' && <MapboxView contracts={contracts} onMarkerClick={setSelectedContract} />}
              {mapView === 'globe' && <GlobeView contracts={contracts} onMarkerClick={setSelectedContract} />}
              {mapView === 'hexglobe' && <GlobeViewHex contracts={contracts} onMarkerClick={setSelectedContract} />}
            </Paper>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={2}>
              {/* Region Distribution */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    By Region
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={regionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {regionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Property Type Distribution */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    By Property Type
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={typeData}>
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Contract List */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Active Leases
              </Typography>
              <Grid container spacing={2}>
                {contracts.map((contract) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={contract.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 6 },
                        bgcolor: selectedContract?.id === contract.id ? '#e3f2fd' : 'white'
                      }}
                      onClick={() => {
                        setSelectedContract(contract);
                        setModalContract(contract);
                        setModalOpen(true);
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {contract.city}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {contract.propertyName}
                        </Typography>
                        <Box mt={2}>
                          <Chip label={contract.type} size="small" color="primary" sx={{ mr: 0.5 }} />
                          <Chip label={contract.country} size="small" variant="outlined" />
                        </Box>
                        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold' }}>
                          {formatNumber(contract.sqft)} sqft
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {formatCurrency(contract.annualRent)}/year
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          ${contract.pricePerSqft}/sqft
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Selected Contract Details */}
        {selectedContract && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info" onClose={() => setSelectedContract(null)}>
              <Typography variant="h6">{selectedContract.propertyName}</Typography>
              <Typography>
                {selectedContract.city}, {selectedContract.country} • {selectedContract.type}
              </Typography>
              <Typography>
                <strong>Size:</strong> {formatNumber(selectedContract.sqft)} sqft •
                <strong> Annual Rent:</strong> {formatCurrency(selectedContract.annualRent)} •
                <strong> Price:</strong> ${selectedContract.pricePerSqft}/sqft
              </Typography>
            </Alert>
          </Box>
        )}
      </Container>

      {/* Contract Details Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aria-labelledby="contract-modal-title"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '80%', md: '70%', lg: '60%' },
          maxWidth: 900,
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {modalContract && (
            <>
              {/* Modal Header */}
              <Box sx={{
                p: 3,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start'
              }}>
                <Box>
                  <Typography id="contract-modal-title" variant="h5" fontWeight="bold">
                    {modalContract.propertyName}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 0.5 }}>
                    {modalContract.city}, {modalContract.country}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={modalContract.type}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', mr: 1 }}
                    />
                    <Chip
                      label={modalContract.propertyId}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                  </Box>
                </Box>
                <IconButton
                  onClick={() => setModalOpen(false)}
                  sx={{ color: 'white' }}
                  aria-label="close"
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Modal Content - Scrollable */}
              <Box sx={{ p: 3, overflowY: 'auto', flexGrow: 1 }}>
                <Grid container spacing={3}>
                  {/* Location Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Location
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Address</Typography>
                        <Typography variant="body1">{modalContract.address}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="body2" color="textSecondary">City</Typography>
                        <Typography variant="body1">{modalContract.city}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="body2" color="textSecondary">Country</Typography>
                        <Typography variant="body1">{modalContract.country}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Reporting Region</Typography>
                        <Typography variant="body1">{modalContract.reportingRegion}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Financial Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Financial Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="textSecondary">Monthly Rent</Typography>
                        <Typography variant="h6" color="success.main">
                          {formatCurrency(modalContract.monthlyRent)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="textSecondary">Annual Rent</Typography>
                        <Typography variant="h6" color="success.main">
                          {formatCurrency(modalContract.annualRent)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="textSecondary">Price per SqFt</Typography>
                        <Typography variant="h6">${modalContract.pricePerSqft}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="textSecondary">Security Deposit</Typography>
                        <Typography variant="h6">{formatCurrency(modalContract.securityDeposit)}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Space Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Space Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Total Square Footage</Typography>
                        <Typography variant="h6">{formatNumber(modalContract.sqft)} sqft</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Property Type</Typography>
                        <Typography variant="h6">{modalContract.type}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Lease Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Lease Terms
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="textSecondary">Lease Start Date</Typography>
                        <Typography variant="body1">{modalContract.leaseStartDate}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="textSecondary">Lease End Date</Typography>
                        <Typography variant="body1">{modalContract.leaseEndDate}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="textSecondary">Lease Term</Typography>
                        <Typography variant="body1">{modalContract.leaseTerm} years</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="textSecondary">Renewal Options</Typography>
                        <Typography variant="body1">{modalContract.renewalOptions}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="textSecondary">Landlord</Typography>
                        <Typography variant="body1">{modalContract.landlord}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}

export default App;
