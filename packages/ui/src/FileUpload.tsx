'use client';

import React, { useRef, useState } from 'react';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  onFiles: (files: File[]) => void;
  uploading?: boolean;
  progress?: number; // 0–100
  error?: string;
  className?: string;
}

export function FileUpload({
  accept,
  multiple = false,
  maxSizeMb,
  onFiles,
  uploading = false,
  progress,
  error,
  className,
}: FileUploadProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null): void {
    if (!files?.length) return;
    const arr = Array.from(files);
    if (maxSizeMb) {
      const oversized = arr.filter((f) => f.size > maxSizeMb * 1024 * 1024);
      if (oversized.length) {
        // Let caller decide how to surface the error
        return;
      }
    }
    onFiles(arr);
  }

  return (
    <div
      data-file-upload
      data-drag-over={dragOver || undefined}
      data-uploading={uploading || undefined}
      className={className}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      aria-label="Upload files — click or drag and drop"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {uploading && progress !== undefined ? (
        <div data-file-upload-progress>
          <progress value={progress} max={100} aria-label="Upload progress" />
          <span>{progress}%</span>
        </div>
      ) : (
        <span data-file-upload-prompt>
          {dragOver ? 'Drop files here' : 'Click or drag files to upload'}
        </span>
      )}
      {error && <span role="alert" data-file-upload-error>{error}</span>}
    </div>
  );
}
