/**
 * Firebase Storage Service Module
 * 
 * Handles file uploads to Firebase Storage with validation,
 * progress tracking, and error handling.
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

import { getStorageInstance, isFirebaseReady } from './firebase-config.js';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', ...ALLOWED_IMAGE_TYPES];

/**
 * Validate file type
 * @param {File} file - File object
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {boolean} True if file type is valid
 */
function validateFileType(file, allowedTypes) {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 * @param {File} file - File object
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {boolean} True if file size is valid
 */
function validateFileSize(file, maxSize = MAX_FILE_SIZE) {
  return file.size <= maxSize;
}

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
}

/**
 * Upload file to Firebase Storage
 * @param {File} file - File to upload
 * @param {string} path - Storage path
 * @param {function} onProgress - Progress callback (receives percentage)
 * @returns {Promise<string>} Download URL
 */
export async function uploadFile(file, path, onProgress) {
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  // Validate file size
  if (!validateFileSize(file)) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }

  // Generate unique filename
  const uniqueFilename = generateUniqueFilename(file.name);
  const fullPath = `${path}/${uniqueFilename}`;
  
  // Create storage reference
  const storageRef = ref(storage, fullPath);
  
  // Create upload task
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Progress tracking
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
        
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        // Handle upload errors
        console.error('Upload error:', error);
        reject(mapStorageError(error));
      },
      async () => {
        // Upload completed successfully
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('File uploaded successfully:', downloadURL);
          resolve(downloadURL);
        } catch (error) {
          console.error('Error getting download URL:', error);
          reject(error);
        }
      }
    );
  });
}

/**
 * Upload fingerprint image
 * @param {File} file - Fingerprint image file
 * @param {string} userId - User ID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} Download URL
 */
export async function uploadFingerprint(file, userId, onProgress) {
  // Validate file type
  if (!validateFileType(file, ALLOWED_IMAGE_TYPES)) {
    throw new Error('Invalid file type. Only JPEG and PNG images are allowed for fingerprints.');
  }

  const path = `uploads/${userId}/fingerprints`;
  return uploadFile(file, path, onProgress);
}

/**
 * Upload document
 * @param {File} file - Document file
 * @param {string} userId - User ID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} Download URL
 */
export async function uploadDocument(file, userId, onProgress) {
  // Validate file type
  if (!validateFileType(file, ALLOWED_DOCUMENT_TYPES)) {
    throw new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed for documents.');
  }

  const path = `uploads/${userId}/documents`;
  return uploadFile(file, path, onProgress);
}

/**
 * Get download URL for a file
 * @param {string} filePath - Full path to file in storage
 * @returns {Promise<string>} Download URL
 */
export async function getFileDownloadURL(filePath) {
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  try {
    const storageRef = ref(storage, filePath);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw mapStorageError(error);
  }
}

/**
 * Delete file from Firebase Storage
 * @param {string} filePath - Full path to file in storage
 * @returns {Promise<void>}
 */
export async function deleteFile(filePath) {
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
    console.log('File deleted successfully:', filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw mapStorageError(error);
  }
}

/**
 * Upload multiple files
 * @param {FileList|Array} files - Files to upload
 * @param {string} userId - User ID
 * @param {string} type - Upload type ('fingerprints' or 'documents')
 * @param {function} onProgress - Progress callback (receives overall percentage)
 * @returns {Promise<Array>} Array of download URLs
 */
export async function uploadMultipleFiles(files, userId, type, onProgress) {
  const fileArray = Array.from(files);
  const totalFiles = fileArray.length;
  let completedFiles = 0;
  const downloadURLs = [];

  for (const file of fileArray) {
    try {
      const fileProgress = (progress) => {
        const overallProgress = ((completedFiles + progress / 100) / totalFiles) * 100;
        if (onProgress) {
          onProgress(overallProgress);
        }
      };

      let downloadURL;
      if (type === 'fingerprints') {
        downloadURL = await uploadFingerprint(file, userId, fileProgress);
      } else {
        downloadURL = await uploadDocument(file, userId, fileProgress);
      }

      downloadURLs.push({
        filename: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type
      });

      completedFiles++;
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      downloadURLs.push({
        filename: file.name,
        error: error.message
      });
    }
  }

  return downloadURLs;
}

/**
 * Map Firebase Storage errors to user-friendly messages
 * @param {Error} error - Firebase Storage error
 * @returns {Error} Error with user-friendly message
 */
function mapStorageError(error) {
  const errorMessages = {
    'storage/unauthorized': 'You do not have permission to upload files.',
    'storage/canceled': 'Upload was canceled.',
    'storage/unknown': 'An unknown error occurred during upload.',
    'storage/object-not-found': 'File not found.',
    'storage/bucket-not-found': 'Storage bucket not found.',
    'storage/project-not-found': 'Firebase project not found.',
    'storage/quota-exceeded': 'Storage quota exceeded.',
    'storage/unauthenticated': 'Please log in to upload files.',
    'storage/retry-limit-exceeded': 'Upload failed after multiple retries.',
    'storage/invalid-checksum': 'File upload failed. Please try again.',
    'storage/canceled-by-user': 'Upload canceled by user.'
  };

  const message = errorMessages[error.code] || error.message || 'An error occurred during file upload.';
  const mappedError = new Error(message);
  mappedError.code = error.code;
  mappedError.originalError = error;
  
  return mappedError;
}

/**
 * Check if Storage is available
 * @returns {boolean} True if Storage is available
 */
export function isStorageAvailable() {
  return isFirebaseReady() && getStorageInstance() !== null;
}

/**
 * Get file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Export for global access (backward compatibility)
window.storageService = {
  uploadFile,
  uploadFingerprint,
  uploadDocument,
  getFileDownloadURL,
  deleteFile,
  uploadMultipleFiles,
  isStorageAvailable,
  formatFileSize
};

console.log('Storage service module loaded');
