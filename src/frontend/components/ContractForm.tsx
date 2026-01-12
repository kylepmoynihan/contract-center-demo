import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  MenuItem,
  Alert,
  Divider,
  InputAdornment,
  FormControlLabel,
  Switch,
  Autocomplete,
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

/**
 * Contract Entry Form Component
 *
 * Features:
 * - Create or edit contract/lease data
 * - Form validation
 * - Auto-calculate fields (price per sqft, lease term)
 * - Address autocomplete with geocoding
 * - Responsive layout
 *
 * This form will be less necessary in Phase 2 when AI extracts data from PDFs
 */

interface ContractFormData {
  contract_number: string;
  contract_type: string;
  property_name: string;
  property_type: string;

  // Location
  address: string;
  city: string;
  state_province: string;
  country: string;
  postal_code: string;
  latitude: string;
  longitude: string;

  // Financial
  monthly_rent: string;
  annual_rent: string;
  currency: string;
  square_footage: string;
  price_per_sqft: string;
  operating_costs: string;
  utilities_included: boolean;
  parking_cost: string;

  // Terms
  start_date: Date | null;
  end_date: Date | null;
  lease_term_months: string;
  renewal_option: boolean;
  renewal_terms: string;

  // Parties
  landlord_name: string;
  landlord_contact: string;
  property_manager: string;

  // Status
  status: string;
}

interface ContractFormProps {
  contractId?: string; // If provided, load and edit existing contract
  onSave?: (contractId: string) => void;
  onCancel?: () => void;
}

const ContractForm: React.FC<ContractFormProps> = ({ contractId, onSave, onCancel }) => {
  const [formData, setFormData] = useState<ContractFormData>({
    contract_number: '',
    contract_type: 'lease',
    property_name: '',
    property_type: 'office',
    address: '',
    city: '',
    state_province: '',
    country: 'United States',
    postal_code: '',
    latitude: '',
    longitude: '',
    monthly_rent: '',
    annual_rent: '',
    currency: 'USD',
    square_footage: '',
    price_per_sqft: '',
    operating_costs: '',
    utilities_included: false,
    parking_cost: '',
    start_date: null,
    end_date: null,
    lease_term_months: '',
    renewal_option: false,
    renewal_terms: '',
    landlord_name: '',
    landlord_contact: '',
    property_manager: '',
    status: 'active',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle input changes
  const handleChange = (field: keyof ContractFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target ? event.target.value : event;

    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate price per sqft
      if (field === 'annual_rent' || field === 'square_footage') {
        const rent = parseFloat(field === 'annual_rent' ? value : prev.annual_rent);
        const sqft = parseFloat(field === 'square_footage' ? value : prev.square_footage);
        if (rent && sqft) {
          updated.price_per_sqft = (rent / sqft).toFixed(2);
        }
      }

      // Auto-calculate annual rent from monthly
      if (field === 'monthly_rent') {
        const monthly = parseFloat(value);
        if (monthly) {
          updated.annual_rent = (monthly * 12).toFixed(2);
        }
      }

      // Auto-calculate lease term
      if ((field === 'start_date' || field === 'end_date') && updated.start_date && updated.end_date) {
        const start = new Date(updated.start_date);
        const end = new Date(updated.end_date);
        const months = (end.getFullYear() - start.getFullYear()) * 12 +
                       (end.getMonth() - start.getMonth());
        updated.lease_term_months = months.toString();
      }

      return updated;
    });
  };

  // Geocode address
  const handleGeocodeAddress = async () => {
    if (!formData.address || !formData.city) {
      return;
    }

    try {
      // Call backend geocoding API (which uses AWS Location Service or similar)
      const response = await axios.post('/api/geocode', {
        address: formData.address,
        city: formData.city,
        state: formData.state_province,
        country: formData.country,
      });

      if (response.data.latitude && response.data.longitude) {
        setFormData((prev) => ({
          ...prev,
          latitude: response.data.latitude.toString(),
          longitude: response.data.longitude.toString(),
        }));
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      // Non-critical error, don't show to user
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.property_name) {
      setError('Property name is required');
      return false;
    }
    if (!formData.country) {
      setError('Country is required');
      return false;
    }
    if (!formData.start_date) {
      setError('Start date is required');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Geocode address if not already done
      if (formData.address && !formData.latitude) {
        await handleGeocodeAddress();
      }

      const organizationId = localStorage.getItem('organizationId');

      // Prepare data for API
      const contractData = {
        ...formData,
        organization_id: organizationId,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
        annual_rent: formData.annual_rent ? parseFloat(formData.annual_rent) : null,
        square_footage: formData.square_footage ? parseFloat(formData.square_footage) : null,
        price_per_sqft: formData.price_per_sqft ? parseFloat(formData.price_per_sqft) : null,
        operating_costs: formData.operating_costs ? parseFloat(formData.operating_costs) : null,
        parking_cost: formData.parking_cost ? parseFloat(formData.parking_cost) : null,
        lease_term_months: formData.lease_term_months ? parseInt(formData.lease_term_months) : null,
      };

      let response;
      if (contractId) {
        // Update existing contract
        response = await axios.put(`/api/contracts/${contractId}`, contractData);
      } else {
        // Create new contract
        response = await axios.post('/api/contracts', contractData);
      }

      setSuccess(true);

      if (onSave) {
        onSave(response.data.contract_id);
      }

      // Reset form if creating new
      if (!contractId) {
        setTimeout(() => {
          window.location.reload(); // Or navigate to contract detail page
        }, 1500);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.response?.data?.message || 'Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
    'China', 'Japan', 'South Korea', 'Taiwan', 'Singapore', 'India'
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {contractId ? 'Edit Contract' : 'Add New Contract'}
          </Typography>

          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contract Number"
                  value={formData.contract_number}
                  onChange={handleChange('contract_number')}
                  helperText="Internal reference number (optional)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Contract Type"
                  value={formData.contract_type}
                  onChange={handleChange('contract_type')}
                  required
                >
                  <MenuItem value="lease">Lease</MenuItem>
                  <MenuItem value="coworking">Coworking</MenuItem>
                  <MenuItem value="license">License</MenuItem>
                  <MenuItem value="sublease">Sublease</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Property Name"
                  value={formData.property_name}
                  onChange={handleChange('property_name')}
                  required
                  helperText="e.g., Silicon Valley Office Building"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Property Type"
                  value={formData.property_type}
                  onChange={handleChange('property_type')}
                >
                  <MenuItem value="office">Office</MenuItem>
                  <MenuItem value="manufacturing">Manufacturing</MenuItem>
                  <MenuItem value="warehouse">Warehouse</MenuItem>
                  <MenuItem value="retail">Retail</MenuItem>
                  <MenuItem value="mixed">Mixed Use</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* Location */}
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>
              Location
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={formData.address}
                  onChange={handleChange('address')}
                  onBlur={handleGeocodeAddress}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city}
                  onChange={handleChange('city')}
                  onBlur={handleGeocodeAddress}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State/Province"
                  value={formData.state_province}
                  onChange={handleChange('state_province')}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <Autocomplete
                  value={formData.country}
                  onChange={(_, value) => handleChange('country')({ target: { value: value || '' }})}
                  options={countries}
                  renderInput={(params) => (
                    <TextField {...params} label="Country" required />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  value={formData.postal_code}
                  onChange={handleChange('postal_code')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Latitude"
                  value={formData.latitude}
                  onChange={handleChange('latitude')}
                  helperText="Auto-filled from address"
                  type="number"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Longitude"
                  value={formData.longitude}
                  onChange={handleChange('longitude')}
                  helperText="Auto-filled from address"
                  type="number"
                />
              </Grid>
            </Grid>

            {/* Financial Information */}
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>
              Financial Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Monthly Rent"
                  value={formData.monthly_rent}
                  onChange={handleChange('monthly_rent')}
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Annual Rent"
                  value={formData.annual_rent}
                  onChange={handleChange('annual_rent')}
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="Auto-calculated from monthly"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Currency"
                  value={formData.currency}
                  onChange={handleChange('currency')}
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="CNY">CNY</MenuItem>
                  <MenuItem value="JPY">JPY</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Square Footage"
                  value={formData.square_footage}
                  onChange={handleChange('square_footage')}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">sq ft</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price per Sq Ft"
                  value={formData.price_per_sqft}
                  onChange={handleChange('price_per_sqft')}
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    endAdornment: <InputAdornment position="end">/sq ft</InputAdornment>,
                  }}
                  helperText="Auto-calculated"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Operating Costs"
                  value={formData.operating_costs}
                  onChange={handleChange('operating_costs')}
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Parking Cost"
                  value={formData.parking_cost}
                  onChange={handleChange('parking_cost')}
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.utilities_included}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          utilities_included: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Utilities Included"
                />
              </Grid>
            </Grid>

            {/* Lease Terms */}
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>
              Lease Terms
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(date) => setFormData((prev) => ({ ...prev, start_date: date }))}
                  slotProps={{
                    textField: { fullWidth: true, required: true },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="End Date"
                  value={formData.end_date}
                  onChange={(date) => setFormData((prev) => ({ ...prev, end_date: date }))}
                  slotProps={{
                    textField: { fullWidth: true },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Lease Term"
                  value={formData.lease_term_months}
                  onChange={handleChange('lease_term_months')}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">months</InputAdornment>,
                  }}
                  helperText="Auto-calculated"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.renewal_option}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          renewal_option: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Renewal Option Available"
                />
              </Grid>
              {formData.renewal_option && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Renewal Terms"
                    value={formData.renewal_terms}
                    onChange={handleChange('renewal_terms')}
                    multiline
                    rows={2}
                  />
                </Grid>
              )}
            </Grid>

            {/* Parties */}
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>
              Landlord & Management
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Landlord Name"
                  value={formData.landlord_name}
                  onChange={handleChange('landlord_name')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Property Manager"
                  value={formData.property_manager}
                  onChange={handleChange('property_manager')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Landlord Contact"
                  value={formData.landlord_contact}
                  onChange={handleChange('landlord_contact')}
                  multiline
                  rows={2}
                  helperText="Email, phone, address"
                />
              </Grid>
            </Grid>

            {/* Status */}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Status"
                  value={formData.status}
                  onChange={handleChange('status')}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="terminated">Terminated</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* Alerts */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Contract saved successfully!
              </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={loading}
              >
                {loading ? 'Saving...' : contractId ? 'Update Contract' : 'Create Contract'}
              </Button>
              {onCancel && (
                <Button variant="outlined" startIcon={<Cancel />} onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </Box>
          </form>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
};

export default ContractForm;
