import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Download,
  Close,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import axios from 'axios';

/**
 * Spreadsheet Upload Component
 *
 * Features:
 * - Drag & drop or click to upload Excel/CSV files
 * - Parse spreadsheet and preview data
 * - Column mapping (map spreadsheet columns to database fields)
 * - Validation before import
 * - Progress tracking
 * - Error handling with detailed feedback
 * - Download template spreadsheet
 *
 * Supported formats: .xlsx, .xls, .csv
 */

interface SpreadsheetRow {
  [key: string]: any;
}

interface ColumnMapping {
  source: string; // Spreadsheet column name
  target: string; // Database field name
  required: boolean;
}

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

const SpreadsheetUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<SpreadsheetRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Expected database fields (from schema)
  const dbFields = [
    { name: 'contract_number', label: 'Contract Number', required: false },
    { name: 'contract_type', label: 'Contract Type', required: true },
    { name: 'property_name', label: 'Property Name', required: true },
    { name: 'property_type', label: 'Property Type', required: false },
    { name: 'address', label: 'Address', required: false },
    { name: 'city', label: 'City', required: false },
    { name: 'state_province', label: 'State/Province', required: false },
    { name: 'country', label: 'Country', required: true },
    { name: 'postal_code', label: 'Postal Code', required: false },
    { name: 'latitude', label: 'Latitude', required: false },
    { name: 'longitude', label: 'Longitude', required: false },
    { name: 'monthly_rent', label: 'Monthly Rent', required: false },
    { name: 'annual_rent', label: 'Annual Rent', required: false },
    { name: 'currency', label: 'Currency', required: false },
    { name: 'square_footage', label: 'Square Footage', required: false },
    { name: 'price_per_sqft', label: 'Price per SqFt', required: false },
    { name: 'operating_costs', label: 'Operating Costs', required: false },
    { name: 'utilities_included', label: 'Utilities Included', required: false },
    { name: 'parking_cost', label: 'Parking Cost', required: false },
    { name: 'start_date', label: 'Start Date', required: true },
    { name: 'end_date', label: 'End Date', required: false },
    { name: 'lease_term_months', label: 'Lease Term (Months)', required: false },
    { name: 'renewal_option', label: 'Renewal Option', required: false },
    { name: 'renewal_terms', label: 'Renewal Terms', required: false },
    { name: 'landlord_name', label: 'Landlord Name', required: false },
    { name: 'landlord_contact', label: 'Landlord Contact', required: false },
    { name: 'property_manager', label: 'Property Manager', required: false },
    { name: 'status', label: 'Status', required: false },
  ];

  // File dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
      setError(null);
      parseSpreadsheet(uploadedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Parse spreadsheet file
  const parseSpreadsheet = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData: SpreadsheetRow[] = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) {
          setError('The spreadsheet appears to be empty');
          return;
        }

        // Extract column names
        const cols = Object.keys(jsonData[0]);
        setColumns(cols);
        setData(jsonData);

        // Auto-map columns (fuzzy matching)
        const autoMapping = autoMapColumns(cols);
        setColumnMapping(autoMapping);

        setShowPreview(true);
      } catch (err) {
        console.error('Error parsing spreadsheet:', err);
        setError('Failed to parse spreadsheet. Please ensure it is a valid Excel or CSV file');
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsBinaryString(file);
  };

  // Auto-map columns using fuzzy matching
  const autoMapColumns = (spreadsheetColumns: string[]): ColumnMapping[] => {
    const mapping: ColumnMapping[] = [];

    dbFields.forEach((dbField) => {
      // Try to find matching column (case-insensitive, handles variations)
      const matchedColumn = spreadsheetColumns.find((col) => {
        const normalizedCol = col.toLowerCase().replace(/[_\s-]/g, '');
        const normalizedField = dbField.name.toLowerCase().replace(/[_\s-]/g, '');
        return normalizedCol === normalizedField ||
               normalizedCol.includes(normalizedField) ||
               normalizedField.includes(normalizedCol);
      });

      if (matchedColumn) {
        mapping.push({
          source: matchedColumn,
          target: dbField.name,
          required: dbField.required,
        });
      } else if (dbField.required) {
        // Required field not mapped - user needs to fix
        mapping.push({
          source: '',
          target: dbField.name,
          required: true,
        });
      }
    });

    return mapping;
  };

  // Validate mapping
  const validateMapping = (): boolean => {
    const missingRequired = columnMapping.filter(
      (m) => m.required && !m.source
    );

    if (missingRequired.length > 0) {
      setError(
        `Missing required fields: ${missingRequired.map((m) => m.target).join(', ')}`
      );
      return false;
    }

    return true;
  };

  // Transform data based on column mapping
  const transformData = (): any[] => {
    return data.map((row) => {
      const transformed: any = {};

      columnMapping.forEach((mapping) => {
        if (mapping.source) {
          transformed[mapping.target] = row[mapping.source];
        }
      });

      return transformed;
    });
  };

  // Handle import
  const handleImport = async () => {
    if (!validateMapping()) {
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Transform data
      const transformedData = transformData();

      // Get organization ID from storage
      const organizationId = localStorage.getItem('organizationId');

      // Send to backend API
      const response = await axios.post(
        '/api/contracts/import',
        {
          contracts: transformedData,
          organizationId,
          importMetadata: {
            fileName: file?.name,
            fileSize: file?.size,
            totalRows: data.length,
          },
        },
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 100)
            );
            setProgress(percentCompleted);
          },
        }
      );

      // Handle response
      const importResult: ImportResult = response.data;
      setResult(importResult);

      if (importResult.success) {
        // Success - clear form after delay
        setTimeout(() => {
          handleClear();
        }, 3000);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.response?.data?.message || 'Failed to import data. Please try again');
    } finally {
      setUploading(false);
    }
  };

  // Clear form
  const handleClear = () => {
    setFile(null);
    setData([]);
    setColumns([]);
    setColumnMapping([]);
    setProgress(0);
    setResult(null);
    setError(null);
    setShowPreview(false);
  };

  // Download template
  const handleDownloadTemplate = () => {
    // Create template with headers
    const template = [dbFields.map((f) => f.label)];

    // Add example row
    const exampleRow = dbFields.map((f) => {
      switch (f.name) {
        case 'contract_type':
          return 'lease';
        case 'property_name':
          return 'Example Office Building';
        case 'country':
          return 'United States';
        case 'start_date':
          return '2024-01-01';
        default:
          return '';
      }
    });
    template.push(exampleRow);

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contracts');

    // Download
    XLSX.writeFile(wb, 'RECC_Contract_Import_Template.xlsx');
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Import Contracts from Spreadsheet</Typography>
          <Button
            startIcon={<Download />}
            variant="outlined"
            size="small"
            onClick={handleDownloadTemplate}
          >
            Download Template
          </Button>
        </Box>

        {/* File Upload Area */}
        {!showPreview && (
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.400',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop your file here' : 'Drag & drop your spreadsheet here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to select a file
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Supported formats: .xlsx, .xls, .csv (Max 10MB)
            </Typography>
          </Box>
        )}

        {/* Preview & Mapping */}
        {showPreview && !result && (
          <>
            <Alert severity="info" sx={{ mb: 2 }} icon={<Info />}>
              <strong>{data.length} rows</strong> found in <strong>{file?.name}</strong>
              <br />
              Review the column mapping below and click Import when ready.
            </Alert>

            {/* Preview Table */}
            <TableContainer component={Paper} sx={{ mb: 2, maxHeight: 300 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {columns.slice(0, 5).map((col) => (
                      <TableCell key={col}>{col}</TableCell>
                    ))}
                    {columns.length > 5 && (
                      <TableCell>
                        <em>...and {columns.length - 5} more columns</em>
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.slice(0, 3).map((row, idx) => (
                    <TableRow key={idx}>
                      {columns.slice(0, 5).map((col) => (
                        <TableCell key={col}>{String(row[col] || '')}</TableCell>
                      ))}
                      {columns.length > 5 && <TableCell>...</TableCell>}
                    </TableRow>
                  ))}
                  {data.length > 3 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <em>...and {data.length - 3} more rows</em>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Column Mapping Summary */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Column Mapping ({columnMapping.filter((m) => m.source).length} matched)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {columnMapping.filter((m) => m.source).map((mapping, idx) => (
                  <Chip
                    key={idx}
                    label={`${mapping.source} → ${mapping.target}`}
                    size="small"
                    color={mapping.required ? 'primary' : 'default'}
                  />
                ))}
              </Box>
              {columnMapping.some((m) => m.required && !m.source) && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Missing required fields. Please review column mapping.
                </Alert>
              )}
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={handleImport}
                disabled={uploading || !validateMapping()}
              >
                Import {data.length} Contracts
              </Button>
              <Button variant="outlined" onClick={() => setShowMappingDialog(true)}>
                Adjust Mapping
              </Button>
              <Button variant="text" onClick={handleClear}>
                Cancel
              </Button>
            </Box>
          </>
        )}

        {/* Progress */}
        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Importing... {progress}%
            </Typography>
          </Box>
        )}

        {/* Results */}
        {result && (
          <Alert
            severity={result.success ? 'success' : 'error'}
            icon={result.success ? <CheckCircle /> : <ErrorIcon />}
            action={
              <IconButton size="small" onClick={handleClear}>
                <Close />
              </IconButton>
            }
          >
            <strong>
              {result.success ? 'Import Successful!' : 'Import Completed with Errors'}
            </strong>
            <br />
            {result.imported} contracts imported successfully
            {result.failed > 0 && `, ${result.failed} failed`}
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Column Mapping Dialog (simplified for now) */}
        <Dialog open={showMappingDialog} onClose={() => setShowMappingDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Adjust Column Mapping</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Map your spreadsheet columns to the database fields:
            </Typography>
            <List>
              {columnMapping.map((mapping, idx) => (
                <ListItem key={idx}>
                  <ListItemText
                    primary={mapping.target}
                    secondary={mapping.source || 'Not mapped'}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowMappingDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SpreadsheetUpload;
