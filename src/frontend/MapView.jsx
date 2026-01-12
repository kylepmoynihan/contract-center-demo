import React, { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';

// Simple map visualization without Mapbox dependency
// We'll create a world map with plotted points

const MapView = ({ contracts, onMarkerClick }) => {
  const [hoveredContract, setHoveredContract] = useState(null);

  // Convert lat/lng to SVG coordinates (simple projection)
  const project = (lat, lng) => {
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x, y };
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#e0f2ff' }}>
      {/* World Map SVG */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 50"
        style={{ border: '2px solid #1976d2', borderRadius: '8px' }}
      >
        {/* Background */}
        <rect width="100" height="50" fill="#e0f2ff" />

        {/* Grid lines */}
        {[...Array(11)].map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 10}
            y1={0}
            x2={i * 10}
            y2={50}
            stroke="#90caf9"
            strokeWidth="0.1"
          />
        ))}
        {[...Array(6)].map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * 10}
            x2={100}
            y2={i * 10}
            stroke="#90caf9"
            strokeWidth="0.1"
          />
        ))}

        {/* Region labels */}
        <text x="25" y="25" fontSize="3" fill="#0277bd" opacity="0.3" textAnchor="middle">
          AMERICAS
        </text>
        <text x="85" y="20" fontSize="3" fill="#0277bd" opacity="0.3" textAnchor="middle">
          ASIA
        </text>
        <text x="47" y="15" fontSize="3" fill="#0277bd" opacity="0.3" textAnchor="middle">
          EUROPE
        </text>

        {/* Plot contracts as markers */}
        {contracts.map((contract) => {
          const pos = project(contract.lat, contract.lng);
          const isHovered = hoveredContract?.id === contract.id;

          // Color by type
          const colors = {
            'Office': '#2196f3',
            'Factory': '#f44336',
            'Lab/R&D': '#4caf50',
            'Warehouse': '#ff9800',
            'Distribution': '#9c27b0'
          };
          const color = colors[contract.type] || '#757575';

          return (
            <g key={contract.id}>
              {/* Marker */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? 1.5 : 0.8}
                fill={color}
                stroke="white"
                strokeWidth={isHovered ? 0.3 : 0.2}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredContract(contract)}
                onMouseLeave={() => setHoveredContract(null)}
                onClick={() => onMarkerClick(contract)}
              />

              {/* Pulsing animation for hovered marker */}
              {isHovered && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={2}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.2}
                  opacity={0.6}
                >
                  <animate
                    attributeName="r"
                    from="1.5"
                    to="3"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.6"
                    to="0"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoveredContract && (
        <Box
          sx={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            bgcolor: 'white',
            p: 2,
            borderRadius: 1,
            boxShadow: 3,
            maxWidth: '300px'
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            {hoveredContract.propertyName}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {hoveredContract.city}, {hoveredContract.country}
          </Typography>
          <Box mt={1}>
            <Chip label={hoveredContract.type} size="small" color="primary" />
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Size:</strong> {hoveredContract.sqft.toLocaleString()} sqft
          </Typography>
          <Typography variant="body2">
            <strong>Annual Rent:</strong> ${hoveredContract.annualRent.toLocaleString()}
          </Typography>
          <Typography variant="body2">
            <strong>Price:</strong> ${hoveredContract.pricePerSqft}/sqft
          </Typography>
        </Box>
      )}

      {/* Legend */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          bgcolor: 'white',
          p: 1.5,
          borderRadius: 1,
          boxShadow: 2
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
          Property Types:
        </Typography>
        {['Office', 'Factory', 'Lab/R&D', 'Warehouse', 'Distribution'].map((type) => {
          const colors = {
            'Office': '#2196f3',
            'Factory': '#f44336',
            'Lab/R&D': '#4caf50',
            'Warehouse': '#ff9800',
            'Distribution': '#9c27b0'
          };
          return (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 0.3 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: colors[type],
                  mr: 0.5
                }}
              />
              <Typography variant="caption">{type}</Typography>
            </Box>
          );
        })}
      </Box>

      {/* Instructions */}
      <Box
        sx={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          p: 1,
          borderRadius: 1
        }}
      >
        <Typography variant="caption">
          💡 Hover over markers to see details • Click to select
        </Typography>
      </Box>
    </Box>
  );
};

export default MapView;
