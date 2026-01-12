// ContractMap.tsx - Interactive map component with multi-level geographic insights
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Map, { Source, Layer, Popup, NavigationControl, ScaleControl } from 'react-map-gl';
import { Box, Paper, Typography, Chip, CircularProgress, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import { API, Auth } from 'aws-amplify';
import debounce from 'lodash/debounce';
import 'mapbox-gl/dist/mapbox-gl.css';

// Types
interface Contract {
  id: string;
  property_name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
  location: {
    type: string;
    coordinates: [number, number];
  };
  monthly_rent: number;
  annual_rent: number;
  price_per_sqft: number;
  total_square_feet: number;
  lease_end_date: string;
  property_type: string;
  status: string;
}

interface GeographicInsight {
  area_name: string;
  avg_price_per_sqft: number;
  contract_count: number;
  total_annual_spend: number;
  total_square_feet: number;
  level: 'building' | 'city' | 'region' | 'state' | 'country';
}

interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

// Styled components
const MapContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '100%',
  width: '100%',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const InsightPanel = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  left: theme.spacing(2),
  padding: theme.spacing(2),
  minWidth: 300,
  maxWidth: 400,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  zIndex: 1000,
}));

const LoadingOverlay = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 1001,
});

const PopupContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  '& .MuiTypography-h6': {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  '& .info-row': {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(0.5),
  },
}));

// Component
export const ContractMap: React.FC = () => {
  // State
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3,
    bearing: 0,
    pitch: 0,
  });

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [insights, setInsights] = useState<GeographicInsight[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [hoveredContract, setHoveredContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [insightLevel, setInsightLevel] = useState<string>('country');

  // Determine insight level based on zoom
  const getInsightLevel = useCallback((zoom: number): string => {
    if (zoom >= 12) return 'building';
    if (zoom >= 10) return 'city';
    if (zoom >= 7) return 'region';
    if (zoom >= 5) return 'state';
    return 'country';
  }, []);

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get('contractAPI', '/contracts', {
        queryStringParameters: {
          limit: 1000,
          status: 'active',
        },
      });
      setContracts(response.contracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch geographic insights
  const fetchInsights = useCallback(async (bounds: any, zoomLevel: number) => {
    try {
      const level = getInsightLevel(zoomLevel);
      setInsightLevel(level);

      const response = await API.post('contractAPI', '/insights/geographic', {
        body: {
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          },
          level,
        },
      });

      setInsights(response.insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  }, [getInsightLevel]);

  // Debounced insight fetch
  const debouncedFetchInsights = useMemo(
    () => debounce(fetchInsights, 500),
    [fetchInsights]
  );

  // Map event handlers
  const handleMapMove = useCallback((evt: any) => {
    setViewState(evt.viewState);
    const map = evt.target;
    if (map) {
      debouncedFetchInsights(map.getBounds(), evt.viewState.zoom);
    }
  }, [debouncedFetchInsights]);

  const handleMarkerClick = useCallback((contract: Contract) => {
    setSelectedContract(contract);
  }, []);

  const handleMarkerHover = useCallback((contract: Contract | null) => {
    setHoveredContract(contract);
  }, []);

  // Effects
  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // GeoJSON data for contracts
  const contractsGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: contracts.map(contract => ({
      type: 'Feature',
      geometry: contract.location,
      properties: {
        id: contract.id,
        name: contract.property_name,
        price_per_sqft: contract.price_per_sqft,
        monthly_rent: contract.monthly_rent,
        property_type: contract.property_type,
        ...contract,
      },
    })),
  }), [contracts]);

  // Map layers
  const contractLayer: any = {
    id: 'contracts',
    type: 'circle',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        3, 4,
        10, 8,
        15, 12,
      ],
      'circle-color': [
        'case',
        ['==', ['get', 'property_type'], 'office'], '#2196F3',
        ['==', ['get', 'property_type'], 'manufacturing'], '#FF9800',
        ['==', ['get', 'property_type'], 'coworking'], '#4CAF50',
        '#9E9E9E',
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': 0.8,
    },
  };

  const contractTextLayer: any = {
    id: 'contract-labels',
    type: 'symbol',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 12,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
    },
    paint: {
      'text-color': '#333333',
      'text-halo-color': '#FFFFFF',
      'text-halo-width': 2,
    },
    minzoom: 10,
  };

  // Heat map layer for price density
  const heatmapLayer: any = {
    id: 'price-heatmap',
    type: 'heatmap',
    paint: {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'price_per_sqft'],
        0, 0,
        100, 1,
      ],
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 1,
        15, 3,
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 2,
        15, 20,
      ],
      'heatmap-opacity': 0.3,
    },
    maxzoom: 12,
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate total portfolio value
  const portfolioValue = useMemo(() => {
    return contracts.reduce((sum, contract) => sum + contract.annual_rent, 0);
  }, [contracts]);

  return (
    <MapContainer>
      <Map
        {...viewState}
        onMove={handleMapMove}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
        interactiveLayerIds={['contracts']}
        onClick={(evt) => {
          const feature = evt.features?.[0];
          if (feature?.properties) {
            handleMarkerClick(feature.properties as Contract);
          }
        }}
        onMouseEnter={(evt) => {
          const feature = evt.features?.[0];
          if (feature?.properties) {
            handleMarkerHover(feature.properties as Contract);
            evt.target.getCanvas().style.cursor = 'pointer';
          }
        }}
        onMouseLeave={(evt) => {
          handleMarkerHover(null);
          evt.target.getCanvas().style.cursor = '';
        }}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* Contract markers and heatmap */}
        <Source id="contracts" type="geojson" data={contractsGeoJson}>
          <Layer {...heatmapLayer} />
          <Layer {...contractLayer} />
          <Layer {...contractTextLayer} />
        </Source>

        {/* Popup for selected contract */}
        {selectedContract && (
          <Popup
            longitude={selectedContract.location.coordinates[0]}
            latitude={selectedContract.location.coordinates[1]}
            anchor="bottom"
            onClose={() => setSelectedContract(null)}
            maxWidth="350px"
          >
            <PopupContent>
              <Typography variant="h6">{selectedContract.property_name}</Typography>
              <Chip
                label={selectedContract.property_type}
                size="small"
                color="primary"
                sx={{ mb: 1 }}
              />

              <div className="info-row">
                <Typography variant="body2" color="textSecondary">
                  Address:
                </Typography>
                <Typography variant="body2">
                  {selectedContract.address.city}, {selectedContract.address.state}
                </Typography>
              </div>

              <div className="info-row">
                <Typography variant="body2" color="textSecondary">
                  Monthly Rent:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(selectedContract.monthly_rent)}
                </Typography>
              </div>

              <div className="info-row">
                <Typography variant="body2" color="textSecondary">
                  Price/Sqft:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(selectedContract.price_per_sqft)}
                </Typography>
              </div>

              <div className="info-row">
                <Typography variant="body2" color="textSecondary">
                  Total Sqft:
                </Typography>
                <Typography variant="body2">
                  {selectedContract.total_square_feet.toLocaleString()}
                </Typography>
              </div>

              <div className="info-row">
                <Typography variant="body2" color="textSecondary">
                  Lease End:
                </Typography>
                <Typography variant="body2">
                  {new Date(selectedContract.lease_end_date).toLocaleDateString()}
                </Typography>
              </div>
            </PopupContent>
          </Popup>
        )}

        {/* Hover tooltip */}
        {hoveredContract && (
          <Popup
            longitude={hoveredContract.location.coordinates[0]}
            latitude={hoveredContract.location.coordinates[1]}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            offset={[0, -10]}
          >
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {hoveredContract.property_name}
              </Typography>
              <Typography variant="caption">
                {formatCurrency(hoveredContract.price_per_sqft)}/sqft
              </Typography>
            </Box>
          </Popup>
        )}
      </Map>

      {/* Insights Panel */}
      <Fade in={!loading}>
        <InsightPanel elevation={3}>
          <Typography variant="h6" gutterBottom>
            Geographic Insights
          </Typography>

          <Chip
            label={`Level: ${insightLevel}`}
            size="small"
            color="secondary"
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Total Portfolio Value
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {formatCurrency(portfolioValue)}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Active Contracts
            </Typography>
            <Typography variant="h6">
              {contracts.length}
            </Typography>
          </Box>

          {insights.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Area Statistics
              </Typography>
              {insights.slice(0, 5).map((insight, index) => (
                <Box key={index} sx={{ mb: 1, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
                  <Typography variant="body2" fontWeight="medium">
                    {insight.area_name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      Avg $/sqft: {formatCurrency(insight.avg_price_per_sqft)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Sites: {insight.contract_count}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </>
          )}
        </InsightPanel>
      </Fade>

      {/* Loading overlay */}
      {loading && (
        <LoadingOverlay>
          <CircularProgress />
        </LoadingOverlay>
      )}
    </MapContainer>
  );
};

export default ContractMap;