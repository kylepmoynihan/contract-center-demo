import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import { Box, Typography, Paper, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';

const GlobeViewHex = ({ contracts, onMarkerClick }) => {
  const globeEl = useRef();
  const containerRef = useRef();
  const [selectedContract, setSelectedContract] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

    // Initialize Globe with hexagonal bins style
    const globe = Globe()
      (containerRef.current)
      .width(width)
      .height(height)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .backgroundColor('rgba(0,0,0,0)')
      .atmosphereColor('#3a228a')
      .atmosphereAltitude(0.25);

    globeEl.current = globe;

    // Set initial camera position
    globe.pointOfView({ lat: 30, lng: 0, altitude: 2.5 });

    // Enable auto-rotate and zoom controls
    globe.controls().enableZoom = true;
    globe.controls().zoomSpeed = 1.0;
    if (autoRotate) {
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;
    }

    // Prepare hexagonal bins data (aggregate by country/region)
    const locationGroups = {};
    contracts.forEach(contract => {
      const key = `${contract.city}-${contract.country}`;
      if (!locationGroups[key]) {
        locationGroups[key] = {
          lat: contract.lat,
          lng: contract.lng,
          contracts: [],
          totalRent: 0,
          totalSqft: 0
        };
      }
      locationGroups[key].contracts.push(contract);
      locationGroups[key].totalRent += contract.annualRent;
      locationGroups[key].totalSqft += contract.sqft;
    });

    const hexBinData = Object.values(locationGroups).map(group => ({
      lat: group.lat,
      lng: group.lng,
      weight: Math.log(group.totalRent) / 2, // Use log scale for better visualization
      contracts: group.contracts,
      totalRent: group.totalRent,
      totalSqft: group.totalSqft
    }));

    // Calculate actual rent range for proper color scaling
    const allRents = Object.values(locationGroups).map(g => g.totalRent);
    const minRent = Math.min(...allRents);
    const maxRent = Math.max(...allRents);

    // Add hexagonal bins
    globe
      .hexBinPointsData(hexBinData)
      .hexBinPointWeight('weight')
      .hexAltitude(d => d.sumWeight * 0.01)
      .hexBinResolution(4)
      .hexTopColor(d => {
        // Use the actual totalRent from the first point for color
        const rent = d.points[0].totalRent;
        const normalized = (rent - minRent) / (maxRent - minRent);

        const red = 255;
        const green = Math.floor(255 * (1 - normalized));
        return `rgba(${red}, ${green}, 0, 0.9)`;
      })
      .hexSideColor(d => {
        const rent = d.points[0].totalRent;
        const normalized = (rent - minRent) / (maxRent - minRent);

        const red = 255;
        const green = Math.floor(255 * (1 - normalized));
        return `rgba(${red}, ${green}, 0, 0.6)`;
      })
      .hexBinMerge(true)
      .hexLabel(d => {
        const contracts = d.points[0].contracts;
        const firstContract = contracts[0];
        return `
          <div style="background: rgba(0,0,0,0.85); padding: 12px; border-radius: 8px; color: white; min-width: 200px;">
            <strong style="font-size: 14px;">${firstContract.city}, ${firstContract.country}</strong><br/>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
              <strong>${contracts.length}</strong> lease${contracts.length > 1 ? 's' : ''}<br/>
              <strong>Total:</strong> $${d.points[0].totalRent.toLocaleString()}/year<br/>
              <strong>Space:</strong> ${d.points[0].totalSqft.toLocaleString()} sqft
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #aaa;">
              ${contracts.map(c => `• ${c.propertyName} (${c.type})`).join('<br/>')}
            </div>
          </div>
        `;
      })
      .onHexClick(hex => {
        if (hex && hex.points && hex.points[0] && hex.points[0].contracts) {
          const firstContract = hex.points[0].contracts[0];
          setSelectedContract(firstContract);
          onMarkerClick(firstContract);

          // Zoom to location
          globe.pointOfView({
            lat: hex.lat,
            lng: hex.lng,
            altitude: 1.5
          }, 1000);
        }
      });

    // Add rings around major locations
    const ringsData = contracts.map(contract => ({
      lat: contract.lat,
      lng: contract.lng,
      maxR: 2,
      propagationSpeed: 2,
      repeatPeriod: 2000
    }));

    globe
      .ringsData(ringsData)
      .ringColor(() => 'rgba(255, 165, 0, 0.5)')
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod');

    // Add labels for major cities
    const majorCities = contracts
      .filter(c => c.sqft > 100000 || c.annualRent > 3000000)
      .map(c => ({
        lat: c.lat,
        lng: c.lng,
        text: c.city,
        size: 0.5,
        color: 'rgba(255, 255, 255, 0.9)'
      }));

    globe
      .labelsData(majorCities)
      .labelText('text')
      .labelSize('size')
      .labelColor('color')
      .labelResolution(2)
      .labelAltitude(0.01);

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
  }, [contracts, autoRotate, onMarkerClick]);

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

  const handleZoom = (direction) => {
    if (globeEl.current) {
      const currentPov = globeEl.current.pointOfView();
      const newAltitude = direction === 'in'
        ? Math.max(0.5, currentPov.altitude - 0.5)  // Zoom in (min altitude 0.5)
        : Math.min(5, currentPov.altitude + 0.5);    // Zoom out (max altitude 5)

      globeEl.current.pointOfView({
        lat: currentPov.lat,
        lng: currentPov.lng,
        altitude: newAltitude
      }, 300);
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
          bgcolor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          color: 'white',
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
          sx={{
            mb: 1.5,
            '& .MuiToggleButton-root': {
              color: 'white',
              '&.Mui-selected': {
                bgcolor: 'rgba(255, 165, 0, 0.7)',
                color: 'white'
              }
            }
          }}
        >
          <ToggleButton value={true}>Auto Rotate</ToggleButton>
          <ToggleButton value={false}>Manual</ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
          Zoom:
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <button
            onClick={() => handleZoom('in')}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: 'rgba(255, 165, 0, 0.3)',
              border: '1px solid rgba(255, 165, 0, 0.6)',
              color: 'white',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 165, 0, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 165, 0, 0.3)';
            }}
          >
            + Zoom In
          </button>
          <button
            onClick={() => handleZoom('out')}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: 'rgba(255, 165, 0, 0.3)',
              border: '1px solid rgba(255, 165, 0, 0.6)',
              color: 'white',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 165, 0, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 165, 0, 0.3)';
            }}
          >
            - Zoom Out
          </button>
        </Box>
      </Paper>

      {/* Quick Navigation */}
      <Paper
        sx={{
          position: 'absolute',
          top: 220,
          right: 20,
          p: 1.5,
          bgcolor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          zIndex: 1
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block" mb={1}>
          Quick Jump:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <button
            onClick={() => flyToRegion(37.4, -122, 1.5)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              cursor: 'pointer',
              background: 'rgba(255, 165, 0, 0.2)',
              border: '1px solid rgba(255, 165, 0, 0.5)',
              color: 'white',
              borderRadius: '4px'
            }}
          >
            🇺🇸 Americas
          </button>
          <button
            onClick={() => flyToRegion(25, 120, 1.5)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              cursor: 'pointer',
              background: 'rgba(255, 165, 0, 0.2)',
              border: '1px solid rgba(255, 165, 0, 0.5)',
              color: 'white',
              borderRadius: '4px'
            }}
          >
            🌏 Asia Pacific
          </button>
          <button
            onClick={() => flyToRegion(50, 10, 1.5)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              cursor: 'pointer',
              background: 'rgba(255, 165, 0, 0.2)',
              border: '1px solid rgba(255, 165, 0, 0.5)',
              color: 'white',
              borderRadius: '4px'
            }}
          >
            🇪🇺 Europe
          </button>
          <button
            onClick={() => flyToRegion(30, 0, 2.5)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              cursor: 'pointer',
              background: 'rgba(255, 165, 0, 0.2)',
              border: '1px solid rgba(255, 165, 0, 0.5)',
              color: 'white',
              borderRadius: '4px'
            }}
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
          bgcolor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          zIndex: 1
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
          Hexagonal Heat Map:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box
            sx={{
              width: 20,
              height: 10,
              background: 'linear-gradient(to right, rgba(255, 255, 0, 0.9), rgba(255, 0, 0, 0.9))',
              mr: 1
            }}
          />
          <Typography variant="caption">Low → High Rent</Typography>
        </Box>
        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'rgba(255,255,255,0.7)' }}>
          Height = Total annual rent<br/>
          Color = Rent intensity<br/>
          Rings = Active locations
        </Typography>
      </Paper>

      {/* Instructions */}
      <Paper
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          p: 1.5,
          bgcolor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          zIndex: 1,
          maxWidth: 250
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block" color="orange">
          🌍 Enhanced 3D Globe
        </Typography>
        <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          • Hexagons show location clusters
        </Typography>
        <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          • Height = Annual rent value
        </Typography>
        <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          • Scroll or use buttons to zoom
        </Typography>
        <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          • Hover hexagons for details
        </Typography>
        <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          • Click to zoom & select
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
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            zIndex: 1,
            maxWidth: 300,
            border: '1px solid rgba(255, 165, 0, 0.5)'
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" color="orange">
            {selectedContract.propertyName}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
            {selectedContract.city}, {selectedContract.country}
          </Typography>
          <Chip
            label={selectedContract.type}
            size="small"
            sx={{
              bgcolor: 'rgba(255, 165, 0, 0.3)',
              color: 'orange',
              mb: 1
            }}
          />
          <Typography variant="body2" sx={{ color: 'white' }}>
            <strong>Size:</strong> {selectedContract.sqft.toLocaleString()} sqft
          </Typography>
          <Typography variant="body2" sx={{ color: 'white' }}>
            <strong>Annual Rent:</strong> ${selectedContract.annualRent.toLocaleString()}
          </Typography>
          <Typography variant="body2" sx={{ color: 'white' }}>
            <strong>Price:</strong> ${selectedContract.pricePerSqft}/sqft
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default GlobeViewHex;
