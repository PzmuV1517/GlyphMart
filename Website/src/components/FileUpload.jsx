import React, { useState, useRef } from 'react';
import { Upload, X, Image, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../utils/apiClient';

const FileUpload = ({ onFileUpload, acceptedTypes = 'images', multiple = false, maxFiles = 5 }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const getAcceptAttribute = () => {
    switch (acceptedTypes) {
      case 'images':
        return 'image/png,image/jpeg,image/jpg,image/gif,image/webp';
      case 'apks':
        return '.apk';
      case 'profile':
        return 'image/png,image/jpeg,image/jpg,image/gif,image/webp';
      default:
        return '';
    }
  };

  const getFileTypeIcon = (file) => {
    if (file.type?.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  const handleFileSelect = (files) => {
    const fileList = Array.from(files);
    
    if (!multiple && fileList.length > 1) {
      alert('Only one file is allowed');
      return;
    }

    if (multiple && uploadedFiles.length + fileList.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    fileList.forEach(uploadFile);
  };

  const uploadFile = async (file) => {
    if (!file) return;

    setUploading(true);
    
    try {
      const response = await apiClient.uploadFile(file, acceptedTypes);
      
      const newFile = {
        id: Date.now() + Math.random(),
        name: file.name,
        url: response.url,
        thumbnail: response.thumbnail,
        filename: response.filename,
        type: response.type,
        file: file
      };

      setUploadedFiles(prev => [...prev, newFile]);
      onFileUpload(newFile);
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (fileToRemove) => {
    try {
      if (fileToRemove.filename) {
        await apiClient.deleteFile(fileToRemove.filename, fileToRemove.type);
      }
      
      setUploadedFiles(prev => prev.filter(f => f.id !== fileToRemove.id));
      onFileUpload(null, fileToRemove); // Notify parent of removal
      
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file: ' + error.message);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={getAcceptAttribute()}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {uploading ? 'Uploading...' : `Upload ${acceptedTypes === 'apks' ? 'APK file' : 'images'}`}
        </p>
        <p className="text-sm text-gray-500">
          Drag and drop files here, or click to select files
        </p>
        {acceptedTypes === 'images' && (
          <p className="text-xs text-gray-400 mt-2">
            Supported: PNG, JPG, JPEG, GIF, WebP (max 50MB each)
          </p>
        )}
        {acceptedTypes === 'apks' && (
          <p className="text-xs text-gray-400 mt-2">
            Supported: APK files (max 50MB)
          </p>
        )}
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Uploaded Files:</h4>
          <div className="grid gap-2">
            {uploadedFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {file.thumbnail ? (
                    <img 
                      src={file.thumbnail}  // Use relative URL directly
                      alt="Preview" 
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    getFileTypeIcon(file.file)
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700 truncate max-w-48">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {acceptedTypes === 'images' ? 'Image' : 'APK'} • Uploaded
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file)}
                  className="p-1 text-red-500 hover:text-red-700 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
