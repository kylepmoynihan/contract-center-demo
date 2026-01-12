import React, { useState, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl, Layer, Source } from 'react-map-gl';
import { Box, Typography, Chip, Paper, Divider } from '@mui/material';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox token
const MAPBOX_TOKEN = 'pk.eyJ1Ijoia3lsZXBtb3luaWhhbiIsImEiOiJjbTducDZsMjYwM2dqMmtvaDh0cDE2MmhuIn0._G_tkcGLMXjeECImVYP9eQ';

const MapboxView = ({ contracts, onMarkerClick }) => {
  const [popupInfo, setPopupInfo] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: 10,
    latitude: 30,
    zoom: 1.5,
    pitch: 0,
    bearing: 0
  });

  // Calculate country-level aggregations
  const countryStats = useMemo(() => {
    const stats = {};
    contracts.forEach(contract => {
      if (!stats[contract.country]) {
        stats[contract.country] = {
          country: contract.country,
          region: contract.region,
          count: 0,
          totalRent: 0,
          totalSqft: 0,
          contracts: []
        };
      }
      stats[contract.country].count += 1;
      stats[contract.country].totalRent += contract.annualRent;
      stats[contract.country].totalSqft += contract.sqft;
      stats[contract.country].contracts.push(contract);
    });
    return stats;
  }, [contracts]);

  // Calculate region-level aggregations
  const regionStats = useMemo(() => {
    const stats = {};
    contracts.forEach(contract => {
      if (!stats[contract.region]) {
        stats[contract.region] = {
          region: contract.region,
          count: 0,
          totalRent: 0,
          totalSqft: 0,
          countries: new Set()
        };
      }
      stats[contract.region].count += 1;
      stats[contract.region].totalRent += contract.annualRent;
      stats[contract.region].totalSqft += contract.sqft;
      stats[contract.region].countries.add(contract.country);
    });
    // Convert Set to array for display
    Object.values(stats).forEach(stat => {
      stat.countries = Array.from(stat.countries);
    });
    return stats;
  }, [contracts]);

  // Color by type
  const getMarkerColor = (type) => {
    const colors = {
      'Office': '#2196f3',
      'Factory': '#f44336',
      'Lab/R&D': '#4caf50',
      'Warehouse': '#ff9800',
      'Distribution': '#9c27b0'
    };
    return colors[type] || '#757575';
  };

  const handleMapClick = (e) => {
    // Check if user clicked on a country (we'll use the country label layer)
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const countryName = feature.properties.name || feature.properties.name_en;

      if (countryStats[countryName]) {
        setSelectedRegion(countryStats[countryName]);
      }
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        interactiveLayerIds={['country-label']}
      >
        {/* Add navigation controls */}
        <NavigationControl position="top-right" />
        <ScaleControl />

        {/* Plot contract markers */}
        {contracts.map((contract) => (
          <Marker
            key={contract.id}
            longitude={contract.lng}
            latitude={contract.lat}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setPopupInfo(contract);
              onMarkerClick(contract);
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: getMarkerColor(contract.type),
                border: '2px solid white',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                '&:hover': {
                  transform: 'scale(1.4)',
                  transition: 'transform 0.2s',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                  zIndex: 10
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                // Right-click shows country stats
                if (countryStats[contract.country]) {
                  setSelectedRegion(countryStats[contract.country]);
                  setPopupInfo(null);
                }
              }}
            />
          </Marker>
        ))}

        {/* Popup on click */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <Box sx={{ p: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {popupInfo.propertyName}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {popupInfo.city}, {popupInfo.country}
              </Typography>
              <Chip label={popupInfo.type} size="small" color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">
                <strong>Size:</strong> {popupInfo.sqft.toLocaleString()} sqft
              </Typography>
              <Typography variant="body2">
                <strong>Annual Rent:</strong> ${popupInfo.annualRent.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Price:</strong> ${popupInfo.pricePerSqft}/sqft
              </Typography>
            </Box>
          </Popup>
        )}
      </Map>

      {/* Region Statistics Panel */}
      {selectedRegion && (
        <Paper
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            p: 2,
            bgcolor: 'rgba(255, 255, 255, 0.98)',
            zIndex: 2,
            minWidth: 280,
            maxWidth: 350,
            boxShadow: 3
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {selectedRegion.country}
            </Typography>
            <button
              onClick={() => setSelectedRegion(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px'
              }}
            >
              ×
            </button>
          </Box>

          <Chip
            label={selectedRegion.region}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <Divider sx={{ mb: 1.5 }} />

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Total Leases
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {selectedRegion.count}
            </Typography>
          </Box>

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Total Annual Rent
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="success.main">
              ${selectedRegion.totalRent.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Total Space
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              {selectedRegion.totalSqft.toLocaleString()} sqft
            </Typography>
          </Box>

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Average Price per SqFt
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              ${(selectedRegion.totalRent / selectedRegion.totalSqft).toFixed(2)}
            </Typography>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
            Properties:
          </Typography>
          <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
            {selectedRegion.contracts.map((contract, idx) => (
              <Box key={idx} sx={{ mb: 0.5 }}>
                <Typography variant="caption" display="block" fontWeight="500">
                  • {contract.propertyName}
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary" sx={{ ml: 1.5 }}>
                  {contract.city} - {contract.type} - {contract.sqft.toLocaleString()} sqft
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Region Summary Cards */}
      <Paper
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          p: 1.5,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 1,
          maxWidth: 240,
          maxHeight: '500px',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '6px'
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'rgba(0,0,0,0.05)',
            borderRadius: '3px'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(33, 150, 243, 0.3)',
            borderRadius: '3px',
            '&:hover': {
              bgcolor: 'rgba(33, 150, 243, 0.5)'
            }
          }
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block" mb={1}>
          📊 Regional Overview
        </Typography>
        <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 1, fontSize: '10px' }}>
          Click a country below for details:
        </Typography>

        {Object.values(regionStats).map((region) => (
          <Box key={region.region} sx={{ mb: 1.5 }}>
            <Typography variant="caption" fontWeight="bold" display="block" color="primary" sx={{ mb: 0.5 }}>
              {region.region}
            </Typography>
            {region.countries.map((country) => {
              const countryData = countryStats[country];
              return (
                <Box
                  key={country}
                  onClick={() => {
                    setSelectedRegion(countryData);
                    setPopupInfo(null);
                  }}
                  sx={{
                    mb: 0.5,
                    p: 0.8,
                    bgcolor: selectedRegion?.country === country ? 'rgba(33, 150, 243, 0.15)' : 'rgba(33, 150, 243, 0.05)',
                    borderRadius: 1,
                    border: selectedRegion?.country === country ? '1px solid rgba(33, 150, 243, 0.5)' : '1px solid rgba(33, 150, 243, 0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(33, 150, 243, 0.2)',
                      borderColor: 'rgba(33, 150, 243, 0.6)',
                      transform: 'translateX(3px)'
                    }
                  }}
                >
                  <Typography variant="caption" fontWeight="500" display="block">
                    {country}
                  </Typography>
                  <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '10px' }}>
                    {countryData.count} {countryData.count === 1 ? 'lease' : 'leases'} • ${(countryData.totalRent / 1000000).toFixed(1)}M
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ))}
      </Paper>

      {/* Legend */}
      <Paper
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          p: 1.5,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 1
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
          Property Types:
        </Typography>
        {['Office', 'Factory', 'Lab/R&D', 'Warehouse', 'Distribution'].map((type) => (
          <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 0.3 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: getMarkerColor(type),
                mr: 0.5,
                border: '1px solid #ccc'
              }}
            />
            <Typography variant="caption">{type}</Typography>
          </Box>
        ))}
      </Paper>

      {/* Mapbox Token Warning */}
      {!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('demo') ? (
        <Paper
          sx={{
            position: 'absolute',
            top: 60,
            left: 20,
            p: 1.5,
            bgcolor: 'rgba(255, 152, 0, 0.95)',
            color: 'white',
            zIndex: 1,
            maxWidth: 300
          }}
        >
          <Typography variant="caption" fontWeight="bold">
            ⚠️ Demo Token - Get your free Mapbox token:
          </Typography>
          <Typography variant="caption" display="block">
            1. Visit https://account.mapbox.com/
          </Typography>
          <Typography variant="caption" display="block">
            2. Sign up (free)
          </Typography>
          <Typography variant="caption" display="block">
            3. Copy your token
          </Typography>
          <Typography variant="caption" display="block">
            4. Replace MAPBOX_TOKEN in MapboxView.jsx
          </Typography>
        </Paper>
      ) : null}
    </Box>
  );
};

export default MapboxView;
