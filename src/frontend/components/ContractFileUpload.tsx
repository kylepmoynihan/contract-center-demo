import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
  PictureAsPdf,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

/**
 * Contract File Upload Component
 *
 * Features:
 * - Upload PDF contract documents to S3
 * - Multiple file upload support
 * - Progress tracking per file
 * - File size validation
 * - Preview file list before upload
 * - Link uploaded files to contracts
 *
 * Phase 2 enhancements:
 * - Automatic OCR and text extraction
 * - AI-powered contract summarization
 * - Key terms extraction
 */

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  s3Key?: string;
  s3Url?: string;
}

interface ContractFileUploadProps {
  contractId?: string; // If provided, link upload to this contract
  onUploadComplete?: (files: Array<{ s3Key: string; s3Url: string; fileName: string }>) => void;
  allowMultiple?: boolean;
  maxFileSize?: number; // in MB
}

const ContractFileUpload: React.FC<ContractFileUploadProps> = ({
  contractId,
  onUploadComplete,
  allowMultiple = true,
  maxFileSize = 50, // 50MB default
}) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // File dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setGlobalError(null);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map((rejected) => {
        if (rejected.errors[0]?.code === 'file-too-large') {
          return `${rejected.file.name} is too large (max ${maxFileSize}MB)`;
        }
        if (rejected.errors[0]?.code === 'file-invalid-type') {
          return `${rejected.file.name} is not a supported file type`;
        }
        return `${rejected.file.name} was rejected`;
      });
      setGlobalError(errors.join(', '));
    }

    // Add accepted files to upload queue
    if (acceptedFiles.length > 0) {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        status: 'pending',
        progress: 0,
      }));

      if (allowMultiple) {
        setUploadFiles((prev) => [...prev, ...newFiles]);
      } else {
        setUploadFiles(newFiles);
      }
    }
  }, [allowMultiple, maxFileSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: allowMultiple ? undefined : 1,
    maxSize: maxFileSize * 1024 * 1024,
    multiple: allowMultiple,
  });

  // Remove file from queue
  const handleRemoveFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Get pre-signed S3 URL from backend
  const getPresignedUrl = async (fileName: string, fileType: string) => {
    const organizationId = localStorage.getItem('organizationId');

    const response = await axios.post('/api/contracts/upload-url', {
      fileName,
      fileType,
      organizationId,
      contractId,
    });

    return response.data; // { uploadUrl, s3Key, s3Url }
  };

  // Upload single file to S3
  const uploadFileToS3 = async (index: number) => {
    const uploadFile = uploadFiles[index];

    // Update status to uploading
    setUploadFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: 'uploading' as const } : f))
    );

    try {
      // Step 1: Get pre-signed URL from backend
      const { uploadUrl, s3Key, s3Url } = await getPresignedUrl(
        uploadFile.file.name,
        uploadFile.file.type
      );

      // Step 2: Upload to S3 using pre-signed URL
      await axios.put(uploadUrl, uploadFile.file, {
        headers: {
          'Content-Type': uploadFile.file.type,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );

          setUploadFiles((prev) =>
            prev.map((f, i) =>
              i === index ? { ...f, progress: percentCompleted } : f
            )
          );
        },
      });

      // Step 3: Update file metadata in database (if contractId provided)
      if (contractId) {
        await axios.patch(`/api/contracts/${contractId}`, {
          contract_document_key: s3Key,
          contract_document_url: s3Url,
          document_size_bytes: uploadFile.file.size,
          document_uploaded_at: new Date().toISOString(),
        });
      }

      // Update status to success
      setUploadFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'success' as const,
                progress: 100,
                s3Key,
                s3Url,
              }
            : f
        )
      );
    } catch (err: any) {
      console.error('Upload error:', err);

      setUploadFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'error' as const,
                error: err.response?.data?.message || 'Upload failed',
              }
            : f
        )
      );
    }
  };

  // Upload all files
  const handleUploadAll = async () => {
    setGlobalError(null);

    // Upload files sequentially (could be parallel for better performance)
    for (let i = 0; i < uploadFiles.length; i++) {
      if (uploadFiles[i].status === 'pending') {
        await uploadFileToS3(i);
      }
    }

    // Callback with successful uploads
    const successfulUploads = uploadFiles
      .filter((f) => f.status === 'success' && f.s3Key && f.s3Url)
      .map((f) => ({
        s3Key: f.s3Key!,
        s3Url: f.s3Url!,
        fileName: f.file.name,
      }));

    if (onUploadComplete && successfulUploads.length > 0) {
      onUploadComplete(successfulUploads);
    }
  };

  // Clear all files
  const handleClearAll = () => {
    setUploadFiles([]);
    setGlobalError(null);
  };

  // Get file icon
  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) {
      return <PictureAsPdf color="error" />;
    }
    return <InsertDriveFile color="primary" />;
  };

  // Get status chip
  const getStatusChip = (file: UploadFile) => {
    switch (file.status) {
      case 'pending':
        return <Chip label="Pending" size="small" />;
      case 'uploading':
        return <Chip label={`${file.progress}%`} size="small" color="primary" />;
      case 'success':
        return <Chip label="Uploaded" size="small" color="success" icon={<CheckCircle />} />;
      case 'error':
        return <Chip label="Failed" size="small" color="error" icon={<ErrorIcon />} />;
    }
  };

  const hasPendingFiles = uploadFiles.some((f) => f.status === 'pending');
  const hasUploadingFiles = uploadFiles.some((f) => f.status === 'uploading');

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upload Contract Documents
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Upload PDF or Word documents (max {maxFileSize}MB per file)
        </Typography>

        {/* Upload Area */}
        {uploadFiles.length === 0 && (
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
              mt: 2,
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              {isDragActive
                ? 'Drop your files here'
                : 'Drag & drop contract documents here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to select files
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Supported: PDF, DOC, DOCX
            </Typography>
          </Box>
        )}

        {/* File List */}
        {uploadFiles.length > 0 && (
          <>
            <List sx={{ mt: 2 }}>
              {uploadFiles.map((uploadFile, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    uploadFile.status === 'pending' ? (
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <Delete />
                      </IconButton>
                    ) : null
                  }
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemIcon>{getFileIcon(uploadFile.file.name)}</ListItemIcon>
                  <ListItemText
                    primary={uploadFile.file.name}
                    secondary={
                      <>
                        {formatFileSize(uploadFile.file.size)}
                        {uploadFile.error && (
                          <Typography variant="caption" color="error" display="block">
                            {uploadFile.error}
                          </Typography>
                        )}
                        {uploadFile.status === 'uploading' && (
                          <LinearProgress
                            variant="determinate"
                            value={uploadFile.progress}
                            sx={{ mt: 1 }}
                          />
                        )}
                      </>
                    }
                  />
                  <Box sx={{ ml: 2 }}>{getStatusChip(uploadFile)}</Box>
                </ListItem>
              ))}
            </List>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={handleUploadAll}
                disabled={!hasPendingFiles || hasUploadingFiles}
              >
                Upload {uploadFiles.filter((f) => f.status === 'pending').length} File(s)
              </Button>
              {allowMultiple && (
                <Box {...getRootProps()}>
                  <input {...getInputProps()} />
                  <Button variant="outlined">Add More Files</Button>
                </Box>
              )}
              <Button variant="text" onClick={handleClearAll} disabled={hasUploadingFiles}>
                Clear All
              </Button>
            </Box>
          </>
        )}

        {/* Global Error */}
        {globalError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {globalError}
          </Alert>
        )}

        {/* Info */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Phase 2 Preview:</strong> In the next phase, uploaded contracts will be
            automatically processed to extract key terms, generate summaries, and enable semantic
            search.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ContractFileUpload;
