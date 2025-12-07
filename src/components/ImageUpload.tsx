import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface ImageUploadProps {
  onImageCapture: (imageFile: File) => void;
  disabled?: boolean;
}

export function ImageUpload({ onImageCapture, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
        // Clear preview after 3 seconds
        setTimeout(() => setPreview(null), 3000);
      };
      reader.readAsDataURL(file);

      onImageCapture(file);

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: 'var(--color-text)',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      title="Image search"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {preview ? (
        <img
          src={preview}
          alt="Preview"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '6px',
          }}
        />
      ) : (
        /* Image icon */
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )}
    </motion.button>
  );
}
