import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import { Box, Typography, Paper, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';

const GlobeView = ({ contracts, onMarkerClick }) => {
  const globeEl = useRef();
  const containerRef = useRef();
  const [selectedContract, setSelectedContract] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

    // Initialize Globe
    const globe = Globe()
      (containerRef.current)
      .width(width)
      .height(height)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .backgroundColor('rgba(0,0,0,0)');

    globeEl.current = globe;

    // Set initial camera position
    globe.pointOfView({ lat: 30, lng: 0, altitude: 2.5 });

    // Enable auto-rotate
    if (autoRotate) {
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;
    }

    // Prepare points data for globe
    const pointsData = contracts.map(contract => ({
      lat: contract.lat,
      lng: contract.lng,
      size: Math.sqrt(contract.sqft) / 100,
      color: getMarkerColor(contract.type),
      contract: contract
    }));

    // Add points to globe
    globe
      .pointsData(pointsData)
      .pointAltitude('size')
      .pointColor('color')
      .pointRadius(0.5)
      .pointLabel(d => {
        const c = d.contract;
        return `
          <div style="background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px; color: white;">
            <strong>${c.propertyName}</strong><br/>
            ${c.city}, ${c.country}<br/>
            <span style="background: ${getMarkerColor(c.type)}; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
              ${c.type}
            </span><br/>
            ${c.sqft.toLocaleString()} sqft<br/>
            $${c.annualRent.toLocaleString()}/year<br/>
            $${c.pricePerSqft}/sqft
          </div>
        `;
      })
      .onPointClick(point => {
        setSelectedContract(point.contract);
        onMarkerClick(point.contract);

        // Zoom to point
        globe.pointOfView({
          lat: point.lat,
          lng: point.lng,
          altitude: 1.5
        }, 1000);
      });

    // Add arcs between major hubs (optional visualization)
    const majorHubs = [
      { lat: 37.4025, lng: -121.9442, name: 'Silicon Valley' },
      { lat: 24.7807, lng: 120.9972, name: 'Hsinchu' },
      { lat: 31.2070, lng: 121.6132, name: 'Shanghai' },
      { lat: 53.3424, lng: -6.2394, name: 'Dublin' }
    ];

    const arcsData = [];
    for (let i = 0; i < majorHubs.length; i++) {
      for (let j = i + 1; j < majorHubs.length; j++) {
        arcsData.push({
          startLat: majorHubs[i].lat,
          startLng: majorHubs[i].lng,
          endLat: majorHubs[j].lat,
          endLng: majorHubs[j].lng,
          color: ['rgba(33, 150, 243, 0.3)', 'rgba(33, 150, 243, 0.3)']
        });
      }
    }

    globe
      .arcsData(arcsData)
      .arcColor('color')
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(3000)
      .arcStroke(0.5);

    // Handle window resize
    const handleResize = () => {
      if (globeEl.current && containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        const newHeight = containerRef.current.offsetHeight;
        globeEl.current.width(newWidth).height(newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeEl.current) {
        globeEl.current._destructor();
      }
    };
  }, [contracts, autoRotate]);

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

  const handleRotateToggle = (event, newValue) => {
    if (newValue !== null) {
      setAutoRotate(newValue);
      if (globeEl.current) {
        globeEl.current.controls().autoRotate = newValue;
      }
    }
  };

  const flyToRegion = (lat, lng, altitude = 2) => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat, lng, altitude }, 1000);
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', bgcolor: '#0a1929', overflow: 'hidden' }}>
      {/* Globe Container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }} />

      {/* Controls */}
      <Paper
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          p: 1.5,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 1
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block" mb={1}>
          Controls:
        </Typography>
        <ToggleButtonGroup
          value={autoRotate}
          exclusive
          onChange={handleRotateToggle}
          size="small"
        >
          <ToggleButton value={true}>Auto Rotate</ToggleButton>
          <ToggleButton value={false}>Manual</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Quick Navigation */}
      <Paper
        sx={{
          position: 'absolute',
          top: 120,
          right: 20,
          p: 1.5,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 1
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block" mb={1}>
          Quick Jump:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <button
            onClick={() => flyToRegion(37.4, -122, 1.5)}
            style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
          >
            🇺🇸 Americas
          </button>
          <button
            onClick={() => flyToRegion(25, 120, 1.5)}
            style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
          >
            🌏 Asia Pacific
          </button>
          <button
            onClick={() => flyToRegion(50, 10, 1.5)}
            style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
          >
            🇪🇺 Europe
          </button>
          <button
            onClick={() => flyToRegion(30, 0, 2.5)}
            style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
          >
            🌍 Global View
          </button>
        </Box>
      </Paper>

      {/* Legend */}
      <Paper
        sx={{
          position: 'absolute',
          bottom: 20,
          left: 20,
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
                border: '1px solid white'
              }}
            />
            <Typography variant="caption">{type}</Typography>
          </Box>
        ))}
      </Paper>

      {/* Instructions */}
      <Paper
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          p: 1,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 1,
          maxWidth: 250
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block">
          🌍 3D Interactive Globe
        </Typography>
        <Typography variant="caption" display="block">
          • Drag to rotate
        </Typography>
        <Typography variant="caption" display="block">
          • Scroll to zoom
        </Typography>
        <Typography variant="caption" display="block">
          • Click markers for details
        </Typography>
        <Typography variant="caption" display="block">
          • Hover markers for info
        </Typography>
      </Paper>

      {/* Selected Contract Info */}
      {selectedContract && (
        <Paper
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            p: 2,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            zIndex: 1,
            maxWidth: 300
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            {selectedContract.propertyName}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {selectedContract.city}, {selectedContract.country}
          </Typography>
          <Chip label={selectedContract.type} size="small" color="primary" sx={{ mb: 1 }} />
          <Typography variant="body2">
            <strong>Size:</strong> {selectedContract.sqft.toLocaleString()} sqft
          </Typography>
          <Typography variant="body2">
            <strong>Annual Rent:</strong> ${selectedContract.annualRent.toLocaleString()}
          </Typography>
          <Typography variant="body2">
            <strong>Price:</strong> ${selectedContract.pricePerSqft}/sqft
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default GlobeView;
