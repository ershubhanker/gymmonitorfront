// MemberModal.jsx - Updated with proper plan change handling for upgrades/downgrades

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, User, Phone, Heart, FileText, Camera, Plus, CheckCircle,
  Calendar, CreditCard, AlertCircle, ChevronRight, Loader2, RefreshCw,
  ChevronUp, ChevronDown, Upload, Trash2, Edit, CalendarDays, Dumbbell,
  Tag, Video, Image, DollarSign, ArrowUp, ArrowDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../services/api';
import AddonManager from './addons/AddonManager';

// ─── Plan type presets ────────────────────────────────────────────────────────
const PLAN_PRESETS = [
  { label: 'Monthly',     plan_type: 'monthly',     duration_days: 30  },
  { label: 'Quarterly',   plan_type: 'quarterly',   duration_days: 90  },
  { label: 'Half-Yearly', plan_type: 'half_yearly', duration_days: 180 },
  { label: 'Yearly',      plan_type: 'yearly',      duration_days: 365 },
];

// ─── DOB Scroll Picker ────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ITEM_H = 40;

// ─── Optimized Image Compression ──────────────────────────────────────────────
const resizeBitmapToFile = (bitmap, sourceFile, maxWidth, maxHeight, quality) => {
  return new Promise((resolve, reject) => {
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const outputFormat = sourceFile.type === 'image/webp' ? 'image/webp' : 'image/jpeg';

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas to Blob conversion failed'));
          return;
        }
        const fileExtension = outputFormat === 'image/webp' ? 'webp' : 'jpg';
        const compressedFile = new File(
          [blob],
          sourceFile.name.replace(/\.[^/.]+$/, '') + '.' + fileExtension,
          { type: outputFormat, lastModified: Date.now() }
        );
        resolve(compressedFile);
      },
      outputFormat,
      quality
    );
  });
};

const compressImageLegacy = (file, maxWidth, maxHeight, quality) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        resizeBitmapToFile(img, file, maxWidth, maxHeight, quality).then(resolve, reject);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

const compressImage = async (file, maxWidth = 600, maxHeight = 600, quality = 0.7) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Not an image file');
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return await resizeBitmapToFile(bitmap, file, maxWidth, maxHeight, quality);
    } catch (err) {
      // Fall through to legacy path
    }
  }

  return compressImageLegacy(file, maxWidth, maxHeight, quality);
};

const ScrollColumn = ({ items, selectedIndex, onChange, label }) => {
  const listRef = useRef(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);

  const scrollToIndex = useCallback((idx, smooth = true) => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => { scrollToIndex(selectedIndex, false); }, [selectedIndex, scrollToIndex]);

  const handleScroll = () => {
    if (!listRef.current || isDragging.current) return;
    const rawIdx = Math.round(listRef.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(rawIdx, items.length - 1));
    if (clamped !== selectedIndex) onChange(clamped);
  };

  const onPointerDown = (e) => {
    isDragging.current = true;
    startY.current = e.clientY ?? e.touches?.[0]?.clientY;
    startScroll.current = listRef.current?.scrollTop ?? 0;
  };
  const onPointerMove = (e) => {
    if (!isDragging.current || !listRef.current) return;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    listRef.current.scrollTop = startScroll.current + (startY.current - y);
  };
  const onPointerUp = () => {
    if (!isDragging.current || !listRef.current) return;
    isDragging.current = false;
    const rawIdx = Math.round(listRef.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(rawIdx, items.length - 1));
    scrollToIndex(clamped);
    if (clamped !== selectedIndex) onChange(clamped);
  };

  return (
    <div className="flex flex-col items-center select-none" style={{ width: 72 }}>
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</span>
      <button type="button" className="text-gray-300 hover:text-blue-500 transition-colors p-1"
        onClick={() => { const ni = Math.max(0, selectedIndex - 1); scrollToIndex(ni); onChange(ni); }}>
        <ChevronUp className="h-4 w-4" />
      </button>
      <div className="relative overflow-hidden rounded-xl" style={{ height: ITEM_H * 3, width: 72 }}>
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 z-10 pointer-events-none rounded-lg border-2 border-blue-500 bg-blue-50/60"
          style={{ top: ITEM_H, height: ITEM_H }} />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
        <div ref={listRef} onScroll={handleScroll}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove}
          onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
          style={{ overflowY: 'scroll', height: '100%', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div style={{ height: ITEM_H }} />
          {items.map((item, i) => (
            <div key={i}
              className={`flex items-center justify-center font-medium transition-all cursor-pointer
                ${i === selectedIndex ? 'text-blue-600 text-base' : 'text-gray-400 text-sm hover:text-gray-600'}`}
              style={{ height: ITEM_H, scrollSnapAlign: 'start' }}
              onClick={() => { scrollToIndex(i); onChange(i); }}>
              {typeof item === 'number' ? String(item).padStart(2, '0') : item}
            </div>
          ))}
          <div style={{ height: ITEM_H }} />
        </div>
      </div>
      <button type="button" className="text-gray-300 hover:text-blue-500 transition-colors p-1"
        onClick={() => { const ni = Math.min(items.length - 1, selectedIndex + 1); scrollToIndex(ni); onChange(ni); }}>
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
};

const DOBPicker = ({ value, onChange, maxDate }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const parseValue = (v) => {
    if (!v) return { year: 1995, month: 0, day: 1 };
    const [y, m, d] = v.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  };
  const parsed = parseValue(value);
  const currentYear = maxDate ? parseInt(maxDate.split('-')[0]) : new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1930; y--) years.push(y);
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth(parsed.year, parsed.month) }, (_, i) => i + 1);
  const yearIdx  = Math.max(0, years.indexOf(parsed.year));
  const monthIdx = parsed.month;
  const dayIdx   = Math.min(parsed.day - 1, days.length - 1);
  const emit = (y, m, d) => {
    const safeDay = Math.min(d + 1, daysInMonth(y, m));
    onChange(`${y}-${String(m + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`);
  };
  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-left flex items-center justify-between bg-white transition-all
          ${open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 hover:border-blue-400'}
          ${!value ? 'text-gray-400' : 'text-gray-800'}`}>
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {value ? displayValue : 'Select date of birth'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl p-5"
          style={{ minWidth: 300 }}
          onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">Date of Birth</p>
          <div className="flex items-start justify-center gap-2">
            <ScrollColumn label="Day"   items={days}   selectedIndex={dayIdx}   onChange={(i) => emit(parsed.year, parsed.month, i)} />
            <div className="w-px bg-gray-100 self-stretch" />
            <ScrollColumn label="Month" items={MONTHS} selectedIndex={monthIdx} onChange={(i) => emit(parsed.year, i, dayIdx)} />
            <div className="w-px bg-gray-100 self-stretch" />
            <ScrollColumn label="Year"  items={years}  selectedIndex={yearIdx}  onChange={(i) => emit(years[i], parsed.month, dayIdx)} />
          </div>
          {value && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-700">{displayValue}</p>
              <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear</button>
            </div>
          )}
          <button type="button" onClick={() => setOpen(false)}
            className="mt-3 w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Camera Capture Component ────────────────────────────────────────────────────
const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (capturedImage) URL.revokeObjectURL(capturedImage);
    };
  }, [capturedImage]);

  const startCamera = async () => {
    setLoading(true);
    setError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode, 
          width: { ideal: 480 }, 
          height: { ideal: 640 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const MAX_CAPTURE_DIM = 640;

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > height) {
      if (width > MAX_CAPTURE_DIM) {
        height = Math.round((height * MAX_CAPTURE_DIM) / width);
        width = MAX_CAPTURE_DIM;
      }
    } else if (height > MAX_CAPTURE_DIM) {
      width = Math.round((width * MAX_CAPTURE_DIM) / height);
      height = MAX_CAPTURE_DIM;
    }
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) {
          setError('Failed to capture photo. Please try again.');
          return;
        }
        setCapturedImage(URL.createObjectURL(blob));
        setCapturedBlob(blob);
      },
      'image/jpeg',
      0.85
    );
  };

  const retakePhoto = () => {
    if (capturedImage) URL.revokeObjectURL(capturedImage);
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  const confirmPhoto = () => {
    if (capturedBlob) {
      const file = new File([capturedBlob], 'camera-capture.jpg', { type: 'image/jpeg' });
      onCapture(file);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4">
      <div className="bg-black rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-white" />
            <span className="text-white font-medium">Take Photo</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative bg-black aspect-video">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
              <span className="text-white ml-2">Starting camera...</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
              <p className="text-red-400 text-center text-sm">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  startCamera();
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
            </>
          ) : (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        <div className="p-4 bg-gray-900 flex items-center justify-center gap-4">
          {!capturedImage ? (
            <>
              <button
                onClick={switchCamera}
                className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                title="Switch Camera"
                disabled={loading}
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={capturePhoto}
                disabled={loading || !!error || capturing}
                className="w-16 h-16 rounded-full border-4 border-white bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {capturing && <Loader2 className="h-6 w-6 text-white animate-spin mx-auto" />}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={retakePhoto}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                <X className="h-4 w-4 inline mr-1" />
                Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4 inline mr-1" />
                Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Profile Photo Uploader ────────────────────────────────────────────────────
const PhotoUploader = ({ memberId, currentPhotoUrl, onPhotoUploaded, getPendingFileRef }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [compressionProgress, setCompressionProgress] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (getPendingFileRef) {
      getPendingFileRef.current = () => pendingFile;
    }
  }, [pendingFile, getPendingFileRef]);

  useEffect(() => {
    if (currentPhotoUrl) {
      if (currentPhotoUrl.startsWith('http')) {
        setPreview(currentPhotoUrl);
      } else {
        setPreview(`${API_BASE_URL}${currentPhotoUrl}`);
      }
    } else {
      setPreview(null);
    }
    setPendingFile(null);
  }, [currentPhotoUrl, memberId]);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE_MB = 5;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please choose an image under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setCompressionProgress(true);
    toast.loading('Compressing image...', { id: 'compress' });
    
    try {
      const compressedFile = await compressImage(file, 600, 600, 0.7);
      
      toast.dismiss('compress');
      
      const localUrl = URL.createObjectURL(compressedFile);
      setPreview(localUrl);

      if (memberId) {
        await uploadFile(compressedFile);
      } else {
        setPendingFile(compressedFile);
        toast.success('Image compressed and ready!');
      }
    } catch (err) {
      toast.dismiss('compress');
      console.error('Compression error:', err);
      toast.error('Failed to compress image. Please try a different image.');
    } finally {
      setCompressionProgress(false);
    }
    
    e.target.value = '';
  };

  const handleCameraCapture = async (file) => {
    setShowCamera(false);
    setUploading(true);
    toast.loading('Saving photo...', { id: 'compress' });

    try {
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      if (memberId) {
        await uploadFile(file);
      } else {
        setPendingFile(file);
        toast.success('Photo captured!');
      }
    } catch (err) {
      console.error('Photo capture error:', err);
      toast.error('Failed to save captured image. Please try again.');
    } finally {
      toast.dismiss('compress');
      setUploading(false);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    toast.loading('Uploading...', { id: 'upload' });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.post(
        `/gym/members/${memberId}/upload-photo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      const fullUrl = res.data.photo_url.startsWith('http') 
        ? res.data.photo_url 
        : `${API_BASE_URL}${res.data.photo_url}`;
      setPreview(fullUrl);
      setPendingFile(null);
      
      if (onPhotoUploaded) onPhotoUploaded(res.data.photo_url);
      
      toast.dismiss('upload');
      toast.success('Photo uploaded successfully!');
    } catch (err) {
      toast.dismiss('upload');
      console.error('Upload error:', err);
      toast.error(err.response?.data?.detail || 'Photo upload failed. Please try again.');
      if (currentPhotoUrl) {
        const revertUrl = currentPhotoUrl.startsWith('http') 
          ? currentPhotoUrl 
          : `${API_BASE_URL}${currentPhotoUrl}`;
        setPreview(revertUrl);
      } else {
        setPreview(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setPendingFile(null);
    if (onPhotoUploaded) onPhotoUploaded(null);
    toast.success('Photo removed');
  };

  return (
    <>
      <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-xl">
        <div className="relative flex-shrink-0">
          {preview ? (
            <img
              src={preview}
              alt="Member photo"
              className="h-20 w-20 rounded-full object-cover border-2 border-blue-200 shadow"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow">
              <User className="h-8 w-8" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || compressionProgress}
            className="absolute -bottom-1 -right-1 bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700 shadow transition-colors disabled:opacity-60"
            title="Upload photo"
          >
            {uploading || compressionProgress ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm">Member Photo</p>
          {compressionProgress && (
            <p className="text-xs text-blue-600 mt-0.5 font-medium animate-pulse">
              🔄 Processing image...
            </p>
          )}
          {pendingFile && !memberId ? (
            <p className="text-xs text-amber-600 mt-0.5 font-medium">
              📎 {pendingFile.name} ({Math.round(pendingFile.size / 1024)}KB) — will upload after saving
            </p>
          ) : uploading ? (
            <p className="text-xs text-blue-600 mt-0.5">Uploading…</p>
          ) : preview ? (
            <p className="text-xs text-green-600 mt-0.5 font-medium">✓ Photo set</p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">Take a photo or upload one</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || compressionProgress}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <Image className="h-3.5 w-3.5" />
              {preview ? 'Change Photo' : 'Upload Photo'}
            </button>
            {!preview && !uploading && !compressionProgress && (
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={uploading || compressionProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                <Video className="h-3.5 w-3.5" />
                Take Photo
              </button>
            )}
            {preview && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
};

// ─── Reusable Plan Form (Create / Edit) ───────────────────────────────────────
const PlanFormModal = ({ plan, onSave, onCancel }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    plan_type: plan?.plan_type || 'monthly',
    duration_days: plan?.duration_days || 30,
    price: plan?.price?.toString() || '',
    discounted_price: plan?.discounted_price?.toString() || '',
    description: plan?.description || '',
    is_active: plan?.is_active ?? true,
  });

  const handlePreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      plan_type: preset.plan_type,
      duration_days: preset.duration_days,
      name: prev.name || preset.label,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (!formData.duration_days || formData.duration_days <= 0) {
      toast.error('Duration must be at least 1 day');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        plan_type: formData.plan_type,
        duration_days: parseInt(formData.duration_days),
        price: parseFloat(formData.price),
        discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : null,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };
      await onSave(payload);
    } catch (error) {
      console.error('Plan save error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
          <Plus className="h-4 w-4" /> {plan ? 'Edit Plan' : 'Create Plan'}
        </h4>
        <button type="button" onClick={onCancel} className="text-blue-400 hover:text-blue-600 p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Plan Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLAN_PRESETS.map(preset => (
              <button key={preset.plan_type} type="button" onClick={() => handlePreset(preset)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                  formData.plan_type === preset.plan_type
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}>
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Click a preset to auto-fill, or enter custom values below</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name <span className="text-red-500">*</span></label>
            <input type="text" value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Basic Monthly"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (days) <span className="text-red-500">*</span>
            </label>
            <input 
              type="number" 
              min="1" 
              max="9999"
              value={formData.duration_days === 0 || formData.duration_days === '' ? '' : formData.duration_days}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setFormData({ ...formData, duration_days: 0 });
                } else {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue >= 1) {
                    setFormData({ ...formData, duration_days: numValue });
                  }
                }
              }}
              onBlur={() => {
                if (formData.duration_days === 0 || formData.duration_days === '') {
                  setFormData({ ...formData, duration_days: 30 });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="e.g., 30, 90, 180, 365"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter any number of days (e.g., 30 for monthly, 365 for yearly)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input type="number" min="0" step="0.01" value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discounted Price (₹) <span className="text-gray-400 font-normal">optional</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input type="number" min="0" step="0.01" value={formData.discounted_price}
                onChange={e => setFormData({ ...formData, discounted_price: e.target.value })}
                placeholder="Optional"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows="2" value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Optional description" />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Plan is active (available for selection)
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <>{plan ? 'Update Plan' : 'Create Plan'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Custom Due Date Picker ────────────────────────────────────────────────────
const CustomDueDatePicker = ({ 
  value, 
  onChange, 
  disabled, 
  minDate,
  onClear 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setShowPicker(!showPicker)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-all ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : showPicker 
              ? 'border-blue-500 ring-2 ring-blue-100 bg-white' 
              : 'border-gray-300 hover:border-blue-400 bg-white'
        } ${value ? 'text-gray-800' : 'text-gray-400'}`}
      >
        <CalendarDays className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">
          {value ? formatDate(value) : 'Select due date'}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {!disabled && (
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
        )}
      </button>
      
      {showPicker && !disabled && (
        <div className="absolute left-0 mt-2 z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 min-w-[280px]">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">Select Due Date</p>
          <input
            type="date"
            value={value || ''}
            min={minDate}
            onChange={(e) => {
              onChange(e.target.value);
              setShowPicker(false);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const nextMonth = new Date(today);
                nextMonth.setMonth(today.getMonth() + 1);
                onChange(nextMonth.toISOString().split('T')[0]);
                setShowPicker(false);
              }}
              className="flex-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Next Month
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                onChange(nextWeek.toISOString().split('T')[0]);
                setShowPicker(false);
              }}
              className="flex-1 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              +7 Days
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="mt-3 w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Payment Date Picker ──────────────────────────────────────────────────────
const PaymentDatePicker = ({ value, onChange, disabled }) => {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setShowPicker(!showPicker)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-all ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : showPicker 
              ? 'border-blue-500 ring-2 ring-blue-100 bg-white' 
              : 'border-gray-300 hover:border-blue-400 bg-white'
        } ${value ? 'text-gray-800' : 'text-gray-400'}`}
      >
        <Calendar className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">
          {value ? formatDate(value) : 'Payment date (today)'}
        </span>
        {!disabled && (
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
        )}
      </button>
      
      {showPicker && !disabled && (
        <div className="absolute left-0 mt-2 z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 min-w-[280px]">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">Select Payment Date</p>
          <input
            type="date"
            value={value || today}
            max={today}
            onChange={(e) => {
              onChange(e.target.value);
              setShowPicker(false);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const todayStr = new Date().toISOString().split('T')[0];
                onChange(todayStr);
                setShowPicker(false);
              }}
              className="flex-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                onChange(yesterday.toISOString().split('T')[0]);
                setShowPicker(false);
              }}
              className="flex-1 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Yesterday
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="mt-3 w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Personal Training Section ────────────────────────────────────────────────────
const PersonalTrainingSection = ({ 
  formData, 
  setFormData, 
  trainers,
  loadingTrainers,
  isEdit
}) => {
  const [showPTOption, setShowPTOption] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [ptAmountError, setPtAmountError] = useState(null);
  
  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    if (formData.pt_session_time) {
      const parts = formData.pt_session_time.split(' - ');
      if (parts.length === 2) {
        setStartTime(parts[0]);
        setEndTime(parts[1]);
      }
    }
  }, [formData.pt_session_time]);

  const updateSessionTime = (start, end) => {
    if (start && end) {
      setFormData(prev => ({ ...prev, pt_session_time: `${start} - ${end}` }));
    } else {
      setFormData(prev => ({ ...prev, pt_session_time: '' }));
    }
  };

  const handleStartTimeChange = (value) => {
    setStartTime(value);
    updateSessionTime(value, endTime);
  };

  const handleEndTimeChange = (value) => {
    setEndTime(value);
    updateSessionTime(startTime, value);
  };

  const toggleDay = (day) => {
    const currentDays = JSON.parse(formData.pt_session_days || '[]');
    const newDays = currentDays.includes(day) 
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    setFormData(prev => ({ ...prev, pt_session_days: JSON.stringify(newDays) }));
  };

  const validatePtAmountPaid = (value) => {
    const totalAmount = parseFloat(formData.pt_total_amount) || 0;
    const amountPaid = parseFloat(value) || 0;
    
    if (totalAmount > 0 && amountPaid > totalAmount) {
      setPtAmountError(`Amount paid cannot exceed total amount (₹${totalAmount})`);
      return false;
    } else {
      setPtAmountError(null);
      return true;
    }
  };

  const handlePtAmountPaidChange = (value) => {
    const totalAmount = parseFloat(formData.pt_total_amount) || 0;
    const amountPaid = parseFloat(value) || 0;
    
    if (totalAmount > 0 && amountPaid > totalAmount) {
      setPtAmountError(`Amount paid cannot exceed ₹${totalAmount}`);
      setFormData(prev => ({ ...prev, pt_amount_paid: value }));
    } else if (amountPaid < 0) {
      setPtAmountError('Amount paid cannot be negative');
      setFormData(prev => ({ ...prev, pt_amount_paid: value }));
    } else {
      setPtAmountError(null);
      setFormData(prev => ({ ...prev, pt_amount_paid: value }));
    }
  };

  const handlePtTotalAmountChange = (value) => {
    const totalAmount = parseFloat(value) || 0;
    const currentPaid = parseFloat(formData.pt_amount_paid) || 0;
    
    setFormData(prev => ({ ...prev, pt_total_amount: value }));
    
    if (currentPaid > totalAmount && totalAmount > 0) {
      setFormData(prev => ({ ...prev, pt_amount_paid: String(totalAmount) }));
      setPtAmountError(null);
    } else if (totalAmount === 0) {
      setPtAmountError(null);
    }
  };

  const setPtFullPayment = () => {
    const totalAmount = parseFloat(formData.pt_total_amount) || 0;
    if (totalAmount > 0) {
      setFormData(prev => ({ ...prev, pt_amount_paid: String(totalAmount) }));
      setPtAmountError(null);
    }
  };

  const setPtHalfPayment = () => {
    const totalAmount = parseFloat(formData.pt_total_amount) || 0;
    if (totalAmount > 0) {
      const halfAmount = Math.floor(totalAmount / 2);
      setFormData(prev => ({ ...prev, pt_amount_paid: String(halfAmount) }));
      setPtAmountError(null);
    }
  };

  const setPtNoPayment = () => {
    setFormData(prev => ({ ...prev, pt_amount_paid: '0' }));
    setPtAmountError(null);
  };

  if (loadingTrainers) {
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading trainers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-blue-600" />
            Personal Training
          </h4>
          <p className="text-sm text-gray-500">Add personal training sessions for this member</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPTOption(!showPTOption)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showPTOption ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            showPTOption ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {showPTOption && (
        <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Trainer <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.pt_trainer_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, pt_trainer_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Select a trainer...</option>
              {trainers.map(trainer => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.full_name} {trainer.position ? `(${trainer.position})` : ''} {trainer.phone ? `- ${trainer.phone}` : ''}
                </option>
              ))}
            </select>
            {trainers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ No trainers found. Please add staff members with trainer positions first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.pt_start_date || ''}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, pt_start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.pt_end_date || ''}
                min={formData.pt_start_date || new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, pt_end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Days <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => {
                const selectedDays = JSON.parse(formData.pt_session_days || '[]');
                const isSelected = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {day.label.substring(0, 3)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select the days of the week for training sessions</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                step="900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                step="900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={formData.pt_total_amount || ''}
                onChange={(e) => handlePtTotalAmountChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                placeholder="e.g., 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Paid (₹)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={formData.pt_amount_paid || ''}
                onChange={(e) => handlePtAmountPaidChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                  ptAmountError ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {ptAmountError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {ptAmountError}
                </p>
              )}
            </div>
          </div>

          {formData.pt_total_amount && parseFloat(formData.pt_total_amount) > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={setPtFullPayment}
                className="flex-1 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                Full (₹{formData.pt_total_amount})
              </button>
              <button
                type="button"
                onClick={setPtHalfPayment}
                className="flex-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Half (₹{Math.floor(parseFloat(formData.pt_total_amount) / 2)})
              </button>
              <button
                type="button"
                onClick={setPtNoPayment}
                className="flex-1 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Pay Later
              </button>
            </div>
          )}

          {formData.pt_total_amount && formData.pt_total_amount > 0 && (
            <div className={`p-3 rounded-lg ${
              (parseFloat(formData.pt_total_amount) - parseFloat(formData.pt_amount_paid || 0)) > 0
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Balance Due:</span>
                <span className={`font-bold ${
                  (parseFloat(formData.pt_total_amount) - parseFloat(formData.pt_amount_paid || 0)) > 0
                    ? 'text-amber-600'
                    : 'text-green-600'
                }`}>
                  ₹{(parseFloat(formData.pt_total_amount || 0) - parseFloat(formData.pt_amount_paid || 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Total: ₹{parseFloat(formData.pt_total_amount || 0).toFixed(2)}</span>
                <span>Paid: ₹{parseFloat(formData.pt_amount_paid || 0).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows="2"
              value={formData.pt_notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, pt_notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              placeholder="Any special requirements or notes for the trainer..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ADD-ONS SELECTION SECTION ──────────────────────────────────────────────
const AddonSelectionSection = ({ 
  formData, 
  setFormData, 
  selectedAddons, 
  setSelectedAddons,
  addons,
  loadingAddons,
  addonTotal,
  setShowAddonManager,
  addonsPaid,
  setAddonsPaid
}) => {
  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      locker: '🔒',
      protein: '💪',
      towel: '🧺',
      supplement: '🧪',
      training: '🏋️',
      parking: '🅿️',
      other: '📦'
    };
    return icons[category] || '📦';
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="h-5 w-5 text-blue-600" />
            Add-Ons
          </h4>
          <p className="text-sm text-gray-500">Add extra services like lockers, protein powder, towels, etc.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddonManager(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Manage Add-Ons
        </button>
      </div>

      {loadingAddons ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : addons.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400">
          <p className="text-sm">No add-ons available</p>
          <p className="text-xs mt-1">Create add-ons from the "Manage Add-Ons" button</p>
        </div>
      ) : (
        <div className="space-y-2">
          {addons.map(addon => {
            const isSelected = selectedAddons.some(a => a.id === addon.id);
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => toggleAddon(addon)}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-blue-200' : 'bg-gray-100'
                    }`}>
                      <span className="text-xl">{getCategoryIcon(addon.category)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{addon.name}</p>
                      <p className="text-xs text-gray-500">{addon.description || addon.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-600">₹{addon.price}</span>
                    {isSelected ? (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedAddons.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-700">
              {selectedAddons.length} add-on(s) selected
            </span>
            <span className="font-bold text-blue-700">
              Total: ₹{addonTotal}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {selectedAddons.map(addon => (
              <span key={addon.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full text-xs border border-blue-200 text-gray-700">
                {getCategoryIcon(addon.category)} {addon.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAddon(addon);
                  }}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-blue-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addonsPaid}
              onChange={(e) => setAddonsPaid(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Collect full ₹{addonTotal} for add-ons now (uncheck to assign unpaid — pay later from Add-On Manager)
          </label>
        </div>
      )}
    </div>
  );
};

// ─── PLAN CHANGE PREVIEW COMPONENT ───────────────────────────────────────────
const PlanChangePreview = ({ 
  currentPlan, 
  newPlan, 
  changeDate,
  onConfirm,
  onCancel,
  loading 
}) => {
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  useEffect(() => {
    if (currentPlan && newPlan && changeDate) {
      fetchPreview();
    }
  }, [currentPlan, newPlan, changeDate]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const response = await api.post(`/gym/members/${currentPlan.member_id}/change-plan/preview`, {
        new_plan_id: newPlan.id,
        change_date: changeDate,
      });
      setPreviewData(response.data);
    } catch (error) {
      console.error('Error fetching plan change preview:', error);
      toast.error('Failed to calculate plan change');
    } finally {
      setLoadingPreview(false);
    }
  };

  if (loadingPreview) {
    return (
      <div className="p-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
        <p className="text-sm text-gray-500 mt-2">Calculating plan change...</p>
      </div>
    );
  }

  if (!previewData) return null;

  const isUpgrade = previewData.is_upgrade;
  const isDowngrade = previewData.is_downgrade;
  const refundAmount = previewData.refund_amount || 0;
  const netRefund = previewData.net_refund || 0;
  const newPlanCost = previewData.new_plan_cost || 0;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 text-sm">Plan Change Summary</h4>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isUpgrade ? 'bg-orange-100 text-orange-700' :
          isDowngrade ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Same Plan'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Current Plan:</span>
          <p className="font-medium text-gray-900">{previewData.old_plan_name}</p>
          <p className="text-gray-400">₹{previewData.old_plan_price}</p>
        </div>
        <div>
          <span className="text-gray-500">New Plan:</span>
          <p className="font-medium text-gray-900">{previewData.new_plan_name}</p>
          <p className="text-gray-400">₹{previewData.new_plan_price}</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Used Days:</span>
            <p className="font-medium text-gray-900">{previewData.used_days}</p>
          </div>
          <div>
            <span className="text-gray-500">Unused Days:</span>
            <p className="font-medium text-gray-900">{previewData.unused_days}</p>
          </div>
          <div>
            <span className="text-gray-500">Daily Rate:</span>
            <p className="font-medium text-gray-900">₹{previewData.daily_rate?.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border border-gray-200">
        {isDowngrade && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Refund from unused days:</span>
              <span className="font-medium text-green-600">₹{refundAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">New plan cost (prorated):</span>
              <span className="font-medium text-orange-600">- ₹{newPlanCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
              <span className="text-gray-700">Net Refund:</span>
              <span className="text-green-600">₹{netRefund.toFixed(2)}</span>
            </div>
          </div>
        )}

        {isUpgrade && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Refund from unused days:</span>
              <span className="font-medium text-green-600">₹{refundAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">New plan cost (prorated):</span>
              <span className="font-medium text-orange-600">- ₹{newPlanCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
              <span className="text-gray-700">Additional Payment:</span>
              <span className="text-orange-600">₹{Math.abs(netRefund).toFixed(2)}</span>
            </div>
          </div>
        )}

        {!isUpgrade && !isDowngrade && (
          <p className="text-xs text-gray-500 text-center">No financial impact - same plan price</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(previewData)}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Confirm Change'
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Membership Selector ────────────────────────────────────────────────────
const MembershipSelector = ({ 
  formData, 
  setFormData, 
  membershipPlans, 
  setMembershipPlans, 
  showPlanCreator, 
  setShowPlanCreator, 
  inputCls, 
  labelCls,
  onRefreshPlans,
  userManuallyChangedAmount,
  setUserManuallyChangedAmount,
  handleAmountChange,
  amountError,
  setAmountError,
  isEdit,
  memberId,
  selectedPlanForChange,
  setSelectedPlanForChange,
  showPlanChangePreview,
  setShowPlanChangePreview,
}) => {
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [changeDate, setChangeDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewData, setPreviewData] = useState(null);
  const selectedPlan = membershipPlans.find(p => String(p.id) === String(formData.plan_id));
  
  const calculatePriceWithDiscount = () => {
    if (!selectedPlan) return null;
    const originalPrice = selectedPlan.discounted_price || selectedPlan.price;
    const discount = parseFloat(formData.discount_applied) || 0;
    const finalPrice = Math.max(0, originalPrice - discount);
    return { originalPrice, discount, finalPrice };
  };

  const priceInfo = calculatePriceWithDiscount();

  const isPartialPayment = () => {
    if (!selectedPlan || !formData.amount_paid) return false;
    const finalPrice = priceInfo?.finalPrice || selectedPlan.discounted_price || selectedPlan.price;
    const paid = parseFloat(formData.amount_paid) || 0;
    return paid > 0 && paid < finalPrice;
  };

  // ─── HANDLE PLAN CHANGE ──────────────────────────────────────────────────────
  const handlePlanChange = async (newPlanId) => {
    if (!isEdit || !memberId) {
      // For new members, just select the plan normally
      setFormData(prev => ({ ...prev, plan_id: newPlanId }));
      return;
    }

    // For existing members, show the plan change preview
    const newPlan = membershipPlans.find(p => String(p.id) === String(newPlanId));
    const currentPlan = membershipPlans.find(p => String(p.id) === String(formData.plan_id));
    
    if (!newPlan || !currentPlan || String(newPlan.id) === String(currentPlan.id)) {
      setFormData(prev => ({ ...prev, plan_id: newPlanId }));
      return;
    }

    setSelectedPlanForChange(newPlan);
    setShowPlanChangePreview(true);
  };

  // ─── CONFIRM PLAN CHANGE ──────────────────────────────────────────────────────
  const confirmPlanChange = async (preview) => {
    setChangingPlan(true);
    try {
      const response = await api.post(`/gym/members/${memberId}/change-plan`, {
        new_plan_id: selectedPlanForChange.id,
        change_date: changeDate,
        refund_type: 'prorated_refund',
        payment_method: formData.payment_method || 'cash',
      });

      if (response.data.success) {
        toast.success(`Plan changed successfully! ${response.data.message}`);
        
        // Update form data with new plan
        setFormData(prev => ({
          ...prev,
          plan_id: String(selectedPlanForChange.id),
          amount_paid: String(response.data.balance_after_refund || 0),
        }));
        
        setShowPlanChangePreview(false);
        setSelectedPlanForChange(null);
        setPreviewData(null);
        await onRefreshPlans();
        
        // Dispatch event to refresh dashboard
        window.dispatchEvent(new CustomEvent('paymentUpdated'));
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      toast.error(error.response?.data?.detail || 'Failed to change plan');
    } finally {
      setChangingPlan(false);
    }
  };

  const handlePlanSelect = (e) => {
    const planId = e.target.value;
    if (isEdit && memberId) {
      handlePlanChange(planId);
    } else {
      setFormData(prev => ({ ...prev, plan_id: planId }));
      setAmountError(null);
      
      if (!userManuallyChangedAmount) {
        const plan = membershipPlans.find(p => String(p.id) === String(planId));
        if (plan) {
          const price = plan.discounted_price || plan.price;
          setFormData(prev => ({ 
            ...prev, 
            amount_paid: String(price),
            custom_due_date: ''
          }));
          setAmountError(null);
        }
      }
    }
  };

  const handlePlanSave = async (planPayload) => {
    if (editingPlan) {
      const res = await api.put(`/gym/plans/${editingPlan.id}`, planPayload);
      toast.success(`Plan "${res.data.name}" updated`);
      setEditingPlan(null);
      await onRefreshPlans();
      if (String(formData.plan_id) === String(editingPlan.id) && !userManuallyChangedAmount) {
        const updatedPlan = res.data;
        const price = updatedPlan.discounted_price || updatedPlan.price;
        setFormData(prev => ({
          ...prev,
          amount_paid: String(price),
          custom_due_date: ''
        }));
        setAmountError(null);
      }
    } else {
      const res = await api.post('/gym/plans', planPayload);
      toast.success(`Plan "${res.data.name}" created`);
      await onRefreshPlans();
      const price = res.data.discounted_price || res.data.price;
      setFormData(prev => ({
        ...prev,
        plan_id: String(res.data.id),
        amount_paid: String(price),
        custom_due_date: ''
      }));
      setUserManuallyChangedAmount(false);
      setAmountError(null);
    }
    setShowPlanCreator(false);
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"? This will not affect existing memberships, but the plan will be removed from selection.`)) return;
    
    setDeletingPlanId(plan.id);
    try {
      const response = await api.delete(`/gym/plans/${plan.id}`);
      toast.success(response.data.message || 'Plan deleted/deactivated successfully');
      
      if (String(formData.plan_id) === String(plan.id)) {
        setFormData(prev => ({ ...prev, plan_id: '', amount_paid: '', custom_due_date: '' }));
        setAmountError(null);
      }
      
      await onRefreshPlans();
    } catch (err) {
      console.error('Delete plan error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to delete plan';
      toast.error(errorMessage);
      
      if (errorMessage.includes('active memberships')) {
        toast.error('You can deactivate the plan instead by editing it and unchecking "Plan is active"');
      }
    } finally {
      setDeletingPlanId(null);
    }
  };

  const startEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowPlanCreator(true);
  };

  const cancelPlanForm = () => {
    setEditingPlan(null);
    setShowPlanCreator(false);
  };

  const validateAmountPaid = (amount, selectedPlan) => {
    if (!selectedPlan) return;
    const planPrice = selectedPlan.discounted_price || selectedPlan.price;
    const discount = parseFloat(formData.discount_applied) || 0;
    const finalPrice = planPrice - discount;
    
    if (parseFloat(amount) > finalPrice) {
      setAmountError(`Amount cannot exceed ₹${finalPrice}`);
    } else {
      setAmountError(null);
    }
  };
  
  const shouldShowPlanCreator = showPlanCreator || membershipPlans.length === 0;

  return (
    <div className="space-y-4">
      {/* Plan Change Preview Modal */}
      {showPlanChangePreview && selectedPlanForChange && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                Change Plan
              </h3>
              <button
                onClick={() => {
                  setShowPlanChangePreview(false);
                  setSelectedPlanForChange(null);
                  setFormData(prev => ({ ...prev, plan_id: formData.plan_id }));
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Change Date
                </label>
                <input
                  type="date"
                  value={changeDate}
                  onChange={(e) => setChangeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  The date when the plan change takes effect
                </p>
              </div>

              <PlanChangePreview
                currentPlan={{ ...selectedPlan, member_id: memberId }}
                newPlan={selectedPlanForChange}
                changeDate={changeDate}
                onConfirm={confirmPlanChange}
                onCancel={() => {
                  setShowPlanChangePreview(false);
                  setSelectedPlanForChange(null);
                  setFormData(prev => ({ ...prev, plan_id: formData.plan_id }));
                }}
                loading={changingPlan}
              />
            </div>
          </div>
        </div>
      )}

      {membershipPlans.length === 0 && !shouldShowPlanCreator && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">No membership plans yet</p>
            <p className="text-sm text-amber-700 mt-0.5">Create your first plan below.</p>
          </div>
        </div>
      )}

      {membershipPlans.length === 0 && !shouldShowPlanCreator && (
        <PlanFormModal onSave={handlePlanSave} onCancel={cancelPlanForm} />
      )}

      {membershipPlans.length > 0 && !shouldShowPlanCreator && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-500">
              {isEdit ? 'Select new plan (change will be prorated):' : 'Select a plan:'}
            </p>
            <button
              type="button"
              onClick={onRefreshPlans}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {membershipPlans.map(plan => {
              const price = plan.discounted_price || plan.price;
              const isSelected = String(formData.plan_id) === String(plan.id);
              const isDeleting = deletingPlanId === plan.id;
              const isCurrentPlan = isEdit && String(formData.plan_id) === String(plan.id);
              
              return (
                <div key={plan.id}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}>
                  <input 
                    type="radio" 
                    name="plan_id" 
                    value={String(plan.id)}
                    checked={isSelected} 
                    onChange={handlePlanSelect}
                    className="accent-blue-600 w-4 h-4 flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{plan.name}</p>
                      {!plan.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                      {isCurrentPlan && isEdit && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={() => startEditPlan(plan)}
                          className="text-gray-400 hover:text-blue-600 p-1"
                          title="Edit plan"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan)}
                          disabled={isDeleting}
                          className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                          title="Delete plan"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.duration_days} days{plan.description ? ` · ${plan.description}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">₹{price}</p>
                    {plan.discounted_price && <p className="text-xs text-gray-400 line-through">₹{plan.price}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => { setEditingPlan(null); setShowPlanCreator(true); }}
            className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Plus className="h-4 w-4" /> Create a new plan
          </button>
        </div>
      )}

      {shouldShowPlanCreator && (
        <PlanFormModal
          plan={editingPlan}
          onSave={handlePlanSave}
          onCancel={cancelPlanForm}
        />
      )}

      {selectedPlan && !shouldShowPlanCreator && (
        <div className="space-y-4">
          <div className="border border-green-200 bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Selected: {selectedPlan.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm text-green-700">
              <div><span className="font-medium">Duration:</span> {selectedPlan.duration_days} days</div>
              <div><span className="font-medium">Price:</span> ₹{selectedPlan.discounted_price || selectedPlan.price}</div>
              <div>
                <span className="font-medium">Expires:</span>{' '}
                {formData.membership_start_date
                  ? new Date(new Date(formData.membership_start_date).getTime() + selectedPlan.duration_days * 86400000)
                      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Start Date <span className="text-red-500">*</span>
                </span>
              </label>
              <input 
                type="date" 
                value={formData.membership_start_date} 
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, membership_start_date: e.target.value }));
                  setFormData(prev => ({ ...prev, custom_due_date: '' }));
                }}
                className={inputCls} 
                style={{ colorScheme: 'light' }} 
              />
              {formData.membership_start_date && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(formData.membership_start_date + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-gray-400" /> Payment Method
                </span>
              </label>
              <select 
                value={formData.payment_method} 
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))} 
                className={inputCls}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="online">Online</option>
              </select>
            </div>
            
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-400 font-bold">₹</span>
                  Discount Amount (Optional)
                </span>
              </label>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                value={formData.discount_applied}
                onChange={(e) => {
                  const discount = parseFloat(e.target.value) || 0;
                  const originalPrice = selectedPlan?.discounted_price || selectedPlan?.price || 0;
                  const maxDiscount = originalPrice;
                  
                  if (discount > maxDiscount) {
                    toast.error(`Discount cannot exceed the plan price of ₹${maxDiscount}`);
                    setFormData(prev => ({ ...prev, discount_applied: String(maxDiscount) }));
                  } else {
                    setFormData(prev => ({ ...prev, discount_applied: e.target.value }));
                  }
                  validateAmountPaid(formData.amount_paid, selectedPlan);
                }}
                className={inputCls} 
                placeholder="0.00"
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter discount amount to subtract from plan price
              </p>
            </div>
            
            {priceInfo && priceInfo.discount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">Price Breakdown</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Original Price:</span>
                    <span className="font-medium">₹{priceInfo.originalPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Discount:</span>
                    <span className="text-red-600 font-medium">- ₹{priceInfo.discount}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-blue-200 font-semibold">
                    <span className="text-green-600">Final Price (After Discount):</span>
                    <span className="text-green-600 font-bold">₹{priceInfo.finalPrice}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs pt-1">
                    <span>GST (5% on final price):</span>
                    <span>₹{(priceInfo.finalPrice - (priceInfo.finalPrice / 1.05)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="sm:col-span-2">
              <label className={labelCls}>Amount Paid (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={formData.amount_paid}
                  onChange={(e) => {
                    const value = e.target.value;
                    const finalPrice = priceInfo?.finalPrice || (selectedPlan?.discounted_price || selectedPlan?.price || 0);
                    if (parseFloat(value) > finalPrice) {
                      setAmountError(`Amount cannot exceed plan price of ₹${finalPrice}`);
                    } else {
                      setAmountError(null);
                    }
                    handleAmountChange(e);
                  }}
                  className={`${inputCls} pl-7 ${amountError ? 'border-red-500 ring-2 ring-red-100' : ''}`} 
                  placeholder="0.00" 
                />
              </div>
              {amountError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {amountError}
                </p>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const finalPrice = priceInfo?.finalPrice || (selectedPlan?.discounted_price || selectedPlan?.price || 0);
                    setUserManuallyChangedAmount(true);
                    setFormData(prev => ({ ...prev, amount_paid: String(finalPrice), custom_due_date: '' }));
                    setAmountError(null);
                  }}
                  className="flex-1 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Full (₹{priceInfo?.finalPrice || (selectedPlan?.discounted_price || selectedPlan?.price || 0)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const finalPrice = priceInfo?.finalPrice || (selectedPlan?.discounted_price || selectedPlan?.price || 0);
                    setUserManuallyChangedAmount(true);
                    const halfPrice = Math.floor(finalPrice / 2);
                    setFormData(prev => ({ ...prev, amount_paid: String(halfPrice) }));
                    setAmountError(null);
                  }}
                  className="flex-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Half (₹{Math.floor((priceInfo?.finalPrice || (selectedPlan?.discounted_price || selectedPlan?.price || 0)) / 2)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserManuallyChangedAmount(true);
                    setFormData(prev => ({ ...prev, amount_paid: '0', custom_due_date: '' }));
                    setAmountError(null);
                  }}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Pay Later
                </button>
              </div>

              {isPartialPayment() && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="text-xs font-semibold text-blue-700 flex items-center gap-2 mb-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Due Date for Remaining Balance
                  </label>
                  <CustomDueDatePicker
                    value={formData.custom_due_date}
                    onChange={(date) => {
                      setFormData(prev => ({ ...prev, custom_due_date: date }));
                      setUserManuallyChangedAmount(true);
                    }}
                    onClear={() => {
                      setFormData(prev => ({ ...prev, custom_due_date: '' }));
                    }}
                    minDate={new Date().toISOString().split('T')[0]}
                    disabled={false}
                  />
                  <p className="text-xs text-blue-600 mt-1.5">
                    👆 Select the date when the remaining balance is due
                  </p>
                </div>
              )}

              {formData.amount_paid !== '' && (() => {
                const planPrice = priceInfo?.finalPrice || (selectedPlan?.discounted_price || selectedPlan?.price || 0);
                const paid = Number(formData.amount_paid);
                const balanceDue = Math.max(0, planPrice - paid);
                
                if (paid > planPrice) {
                  return (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-700 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Amount exceeds plan price by ₹{(paid - planPrice).toFixed(2)}
                      </p>
                    </div>
                  );
                }
                
                if (priceInfo?.discount > 0 && planPrice !== (selectedPlan?.discounted_price || selectedPlan?.price)) {
                  return (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700 flex items-center gap-1.5 font-medium">
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Discount of ₹{priceInfo.discount} applied! Final price: ₹{planPrice}
                      </p>
                    </div>
                  );
                }
                
                if (paid === 0) {
                  return (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-600 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <span>No payment recorded — full amount of <strong>₹{planPrice}</strong> will remain as balance due</span>
                      </p>
                    </div>
                  );
                } else if (paid >= planPrice) {
                  return (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-700 flex items-center gap-1.5 font-medium">
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Full payment — no balance due ✓
                      </p>
                    </div>
                  );
                } else {
                  const dueDateDisplay = formData.custom_due_date 
                    ? new Date(formData.custom_due_date + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })
                    : 'Not set';
                  
                  return (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                      <p className="text-xs text-amber-700 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Partial payment — balance will be tracked
                      </p>
                      <div className="flex justify-between text-xs text-amber-700 pl-5">
                        <span>Final price after discount:</span>
                        <span className="font-medium">₹{planPrice}</span>
                      </div>
                      <div className="flex justify-between text-xs text-amber-700 pl-5">
                        <span>Paying now:</span>
                        <span className="font-medium text-green-700">₹{paid}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-red-600 pl-5 pt-0.5 border-t border-amber-200">
                        <span>Remaining balance due:</span>
                        <span>₹{balanceDue}</span>
                      </div>
                      <div className="flex justify-between text-xs text-blue-600 pl-5 pt-0.5">
                        <span>Due date:</span>
                        <span className="font-medium">{dueDateDisplay}</span>
                      </div>
                      <p className="text-xs text-amber-600 pl-5">Member can pay remaining from Balance tab</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main MemberModal ─────────────────────────────────────────────────────────
const MemberModal = ({ isOpen, onClose,
   onSave,
   member = null,
   userRole = 'gym_owner',
  isFromLead = false,  
  prefillData = null 

 }) => {
  const today = new Date().toISOString().split('T')[0];
  const isEdit = !!member;

  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', date_of_birth: '', gender: 'male',
    address: '', emergency_contact_name: '', emergency_contact_phone: '',
    medical_conditions: '', allergies: '', medications: '',
    id_proof_type: 'aadhar', id_proof_number: '',
    plan_id: '', membership_start_date: today, payment_method: 'cash', amount_paid: '',
    discount_applied: '',
    renew_membership: false,
    custom_due_date: '',
    payment_date: today,
    pt_trainer_id: '',
    pt_start_date: '',
    pt_end_date: '',
    pt_session_time: '',
    pt_session_days: '[]',
    pt_total_amount: '',
    pt_amount_paid: '',
    pt_notes: '',
  });

  const [activeTab, setActiveTab] = useState('personal');
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlanCreator, setShowPlanCreator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userManuallyChangedAmount, setUserManuallyChangedAmount] = useState(false);
  const [amountError, setAmountError] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  
  // Plan change states
  const [selectedPlanForChange, setSelectedPlanForChange] = useState(null);
  const [showPlanChangePreview, setShowPlanChangePreview] = useState(false);

  // ===== ADD-ONS STATE =====
  const [showAddonManager, setShowAddonManager] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [addonTotal, setAddonTotal] = useState(0);
  const [addonsPaid, setAddonsPaid] = useState(true);

  const getPendingFileRef = useRef(null);

  // ===== FETCH ADD-ONS =====
  const fetchAddons = useCallback(async () => {
    setLoadingAddons(true);
    try {
      const response = await api.get('/gym/addons?active_only=true');
      setAddons(response.data || []);
    } catch (error) {
      console.error('Error fetching addons:', error);
      setAddons([]);
    } finally {
      setLoadingAddons(false);
    }
  }, []);

  const refreshMembershipPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const response = await api.get('/gym/plans?active_only=false');
      const plans = response.data || [];
      setMembershipPlans(plans);
      
      if (!member && plans.length === 0) {
        setShowPlanCreator(true);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      toast.error('Could not load membership plans');
    } finally {
      setLoadingPlans(false);
    }
  }, [member]);

  const fetchTrainers = useCallback(async () => {
    setLoadingTrainers(true);
    try {
      const response = await api.get('/gym/trainers');
      setTrainers(response.data || []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      try {
        const staffResponse = await api.get('/gym/staff');
        const trainerPositions = [
          'Head Trainer', 'Trainer', 'Personal Trainer', 
          'Yoga Instructor', 'Spin Instructor', 'Group Fitness Instructor',
          'Zumba Instructor', 'Martial Arts Coach', 'Swimming Coach'
        ];
        const trainers = staffResponse.data.filter(s => 
          s.is_active && trainerPositions.includes(s.position)
        );
        
        if (trainers.length > 0) {
          setTrainers(trainers.map(s => ({
            id: s.user_id,
            staff_id: s.id,
            full_name: s.user?.full_name || 'Unknown',
            email: s.user?.email || '',
            phone: s.user?.phone || '',
            position: s.position,
            role: 'trainer'
          })));
        } else {
          setTrainers([]);
        }
      } catch (fallbackError) {
        console.error('Fallback trainer fetch failed:', fallbackError);
        setTrainers([]);
      }
    } finally {
      setLoadingTrainers(false);
    }
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('personal');
    setSaving(false);
    setShowPlanCreator(false);
    setUserManuallyChangedAmount(false);
    setAmountError(null);
    setSelectedAddons([]);
    setAddonTotal(0);
    setAddonsPaid(true);
    setShowPlanChangePreview(false);
    setSelectedPlanForChange(null);

    const isLeadConversion = isFromLead || (member && member.id === null);
    const rawData = member?.raw || prefillData || {};
    
    console.log('📋 MemberModal - isFromLead:', isFromLead);
    console.log('📋 MemberModal - rawData:', rawData);

    if (member && member.id !== null) {
      setFormData({
        full_name: member.full_name || '',
        email: member.email || '',
        phone: member.phone || '',
        date_of_birth: member.date_of_birth || '',
        gender: member.gender || 'male',
        address: member.address || '',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
        medical_conditions: member.medical_conditions || '',
        allergies: member.allergies || '',
        medications: member.medications || '',
        id_proof_type: member.id_proof_type || 'aadhar',
        id_proof_number: member.id_proof_number || '',
        plan_id: member.current_membership?.plan_id?.toString() || '', 
        membership_start_date: member.current_membership?.start_date || today, 
        payment_method: 'cash', 
        amount_paid: member.current_membership?.amount_paid?.toString() || '',
        discount_applied: member.current_membership?.discount_applied?.toString() || '',
        renew_membership: false,
        custom_due_date: '',
        payment_date: today,
        pt_trainer_id: '',
        pt_start_date: '',
        pt_end_date: '',
        pt_session_time: '',
        pt_session_days: '[]',
        pt_total_amount: '',
        pt_amount_paid: '',
        pt_notes: '',
      });
    } else if (isLeadConversion || rawData.full_name) {
      let gender = rawData.gender || 'male';
      if (typeof gender === 'string') {
        gender = gender.toLowerCase();
        if (!['male', 'female', 'other', 'prefer_not_to_say'].includes(gender)) {
          gender = 'male';
        }
      }
      
      setFormData({
        full_name: rawData.full_name || '',
        email: rawData.email || '',
        phone: rawData.phone || '',
        date_of_birth: rawData.date_of_birth || '',
        gender: gender,
        address: rawData.address || '',
        emergency_contact_name: rawData.emergency_contact_name || '',
        emergency_contact_phone: rawData.emergency_contact_phone || '',
        medical_conditions: rawData.medical_conditions || '',
        allergies: rawData.allergies || '',
        medications: rawData.medications || '',
        id_proof_type: rawData.id_proof_type || 'aadhar',
        id_proof_number: rawData.id_proof_number || '',
        plan_id: '', 
        membership_start_date: today, 
        payment_method: 'cash', 
        amount_paid: '',
        discount_applied: '',
        renew_membership: false,
        custom_due_date: '',
        payment_date: today,
        pt_trainer_id: '',
        pt_start_date: '',
        pt_end_date: '',
        pt_session_time: '',
        pt_session_days: '[]',
        pt_total_amount: '',
        pt_amount_paid: '',
        pt_notes: rawData.notes || '',
      });
      
      if (rawData.interest) {
        console.log('📝 Lead interest:', rawData.interest);
      }
      if (rawData.preferred_plan) {
        console.log('📝 Lead preferred plan:', rawData.preferred_plan);
      }
      if (rawData.budget) {
        console.log('📝 Lead budget:', rawData.budget);
      }
    } else {
      setFormData({
        full_name: '', email: '', phone: '', date_of_birth: '', gender: 'male',
        address: '', emergency_contact_name: '', emergency_contact_phone: '',
        medical_conditions: '', allergies: '', medications: '',
        id_proof_type: 'aadhar', id_proof_number: '',
        plan_id: '', 
        membership_start_date: today, 
        payment_method: 'cash', 
        amount_paid: '',
        discount_applied: '',
        renew_membership: false,
        custom_due_date: '',
        payment_date: today,
        pt_trainer_id: '',
        pt_start_date: '',
        pt_end_date: '',
        pt_session_time: '',
        pt_session_days: '[]',
        pt_total_amount: '',
        pt_amount_paid: '',
        pt_notes: '',
      });
    }
    
    refreshMembershipPlans();
    fetchTrainers();
    fetchAddons();
  }, [isOpen, member, refreshMembershipPlans, fetchTrainers, fetchAddons, today, isFromLead, prefillData]);

  // Calculate addon total
  useEffect(() => {
    const total = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    setAddonTotal(total);
  }, [selectedAddons]);

  // Only set amount_paid automatically when plan is selected AND user hasn't manually changed it
  useEffect(() => {
    if (formData.plan_id && !userManuallyChangedAmount) {
      const plan = membershipPlans.find(p => String(p.id) === String(formData.plan_id));
      if (plan) {
        const price = plan.discounted_price || plan.price;
        setFormData(prev => ({ ...prev, amount_paid: String(price), custom_due_date: '' }));
        setAmountError(null);
      }
    }
  }, [formData.plan_id, membershipPlans, userManuallyChangedAmount]);

  // Handler for amount change - marks that user manually changed it
  const handleAmountChange = (e) => {
    const value = e.target.value;
    const selectedPlan = membershipPlans.find(p => String(p.id) === String(formData.plan_id));
    if (selectedPlan) {
      const planPrice = selectedPlan.discounted_price || selectedPlan.price;
      const discount = parseFloat(formData.discount_applied) || 0;
      const finalPrice = planPrice - discount;
      if (parseFloat(value) > finalPrice) {
        setAmountError(`Amount cannot exceed ₹${finalPrice}`);
      } else {
        setAmountError(null);
      }
    }
    setUserManuallyChangedAmount(true);
    setFormData(prev => ({ ...prev, amount_paid: value }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const selectedPlan = membershipPlans.find(p => String(p.id) === String(formData.plan_id));
    if (selectedPlan && formData.amount_paid) {
      const planPrice = selectedPlan.discounted_price || selectedPlan.price;
      const discount = parseFloat(formData.discount_applied) || 0;
      const finalPrice = planPrice - discount;
      if (parseFloat(formData.amount_paid) > finalPrice) {
        toast.error(`Amount paid cannot exceed ₹${finalPrice}`);
        setActiveTab('membership');
        return;
      }
    }
  
    if (!formData.full_name.trim()) {
      toast.error('Full name is required');
      setActiveTab('personal');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      setActiveTab('personal');
      return;
    }
    if (!/^[+]?[\d\s\-]{7,15}$/.test(formData.phone.trim())) {
      toast.error('Enter a valid phone number (e.g. +91-9876543210)');
      setActiveTab('personal');
      return;
    }
    if (formData.emergency_contact_phone.trim() && !/^[+]?[\d\s\-]{7,15}$/.test(formData.emergency_contact_phone.trim())) {
      toast.error('Enter a valid emergency contact phone number');
      setActiveTab('contact');
      return;
    }
    if (!isEdit && !formData.plan_id) {
      toast.error('Please select a membership plan');
      setActiveTab('membership');
      return;
    }
    if (isEdit && formData.renew_membership && !formData.plan_id) {
      toast.error('Please select a plan to renew');
      setActiveTab('membership');
      return;
    }
  
    // ✅ Validate payment date for renewal
    if (isEdit && formData.renew_membership && !formData.payment_date) {
      toast.error('Please select a payment date for the renewal');
      setActiveTab('membership');
      return;
    }
  
    if (!isEdit) {
      try {
        const phoneCheck = await api.get(`/gym/members?search=${encodeURIComponent(formData.phone.trim())}`);
        const duplicate = phoneCheck.data?.find(
          m => m.phone === formData.phone.trim()
        );
        if (duplicate) {
          toast.error(
            `A member with phone number ${formData.phone.trim()} already exists (${duplicate.full_name}). Please use a different number.`,
            { duration: 5000 }
          );
          setActiveTab('personal');
          return;
        }
      } catch {
        // ignore
      }
    }
  
    setSaving(true);
    try {
      const memberFields = {
        full_name: formData.full_name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone.trim(),
        address: formData.address?.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender,
        emergency_contact_name: formData.emergency_contact_name?.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone?.trim() || null,
        medical_conditions: formData.medical_conditions?.trim() || null,
        allergies: formData.allergies?.trim() || null,
        medications: formData.medications?.trim() || null,
        id_proof_type: formData.id_proof_type || null,
        id_proof_number: formData.id_proof_number?.trim() || null,
      };
  
      console.log('🔍 FORM DATA DEBUG:');
      console.log('  - amount_paid (raw):', formData.amount_paid);
      console.log('  - discount_applied (raw):', formData.discount_applied);
      console.log('  - custom_due_date (raw):', formData.custom_due_date);
      console.log('  - payment_date (raw):', formData.payment_date);
      console.log('  - PT trainer_id:', formData.pt_trainer_id);
      console.log('  - PT start_date:', formData.pt_start_date);
      console.log('  - PT end_date:', formData.pt_end_date);
      console.log('  - PT session_time:', formData.pt_session_time);
  
      const dueDate = formData.custom_due_date && formData.custom_due_date.trim() !== '' 
        ? formData.custom_due_date 
        : null;
      
      const ptData = formData.pt_trainer_id ? {
        trainer_id: formData.pt_trainer_id,
        start_date: formData.pt_start_date,
        end_date: formData.pt_end_date,
        session_time: formData.pt_session_time,
        session_days: formData.pt_session_days || '[]',
        total_amount: formData.pt_total_amount ? parseFloat(formData.pt_total_amount) : null,
        amount_paid: formData.pt_amount_paid ? parseFloat(formData.pt_amount_paid) : 0,
        notes: formData.pt_notes || null
      } : null;
      
      let payload;
      
      // ✅ CRITICAL: Parse amount_paid and discount properly
      const amountPaid = formData.amount_paid ? parseFloat(formData.amount_paid) : 0;
      const discountApplied = formData.discount_applied ? parseFloat(formData.discount_applied) : 0;
      
      console.log('💰 Parsed amount_paid:', amountPaid);
      console.log('💰 Parsed discount_applied:', discountApplied);
      
      if (isEdit && formData.renew_membership) {
        payload = {
          ...memberFields,
          plan_id: formData.plan_id,
          membership_start_date: formData.membership_start_date,
          payment_method: formData.payment_method,
          amount_paid: amountPaid,
          discount_applied: discountApplied,
          renew_membership: true,
          custom_due_date: dueDate,
          payment_date: formData.payment_date,
          pt_data: ptData,
          addons: selectedAddons.map(a => ({
            addon_id: a.id,
            start_date: formData.membership_start_date,
            amount_paid: addonsPaid ? a.price : 0,
          })),
        };
      } else if (isEdit) {
        payload = {
          ...memberFields,
          pt_data: ptData,
        };
      } else {
        payload = {
          ...memberFields,
          plan_id: formData.plan_id,
          membership_start_date: formData.membership_start_date,
          payment_method: formData.payment_method,
          amount_paid: amountPaid,
          discount_applied: discountApplied,
          custom_due_date: dueDate,
          payment_date: formData.payment_date,
          pt_data: ptData,
          addons: selectedAddons.map(a => ({
            addon_id: a.id,
            start_date: formData.membership_start_date,
            amount_paid: addonsPaid ? a.price : 0,
          })),
        };
      }
  
      console.log('📤 Sending payload:', payload);
  
      const savedMember = await onSave(payload);
  
      if (!isEdit && savedMember?.id) {
        const pendingFile = getPendingFileRef.current?.();
        if (pendingFile) {
          try {
            const fd = new FormData();
            fd.append('file', pendingFile);
            await api.post(
              `/gym/members/${savedMember.id}/upload-photo`,
              fd,
              { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            toast.success('Photo uploaded!');
          } catch {
            toast.error('Member saved, but photo upload failed. You can re-upload from edit mode.');
          }
        }
        
        if (selectedAddons.length > 0 && savedMember.id) {
          try {
            for (const addon of selectedAddons) {
              await api.post(`/gym/members/${savedMember.id}/addons`, {
                addon_id: addon.id,
                start_date: formData.membership_start_date,
                amount_paid: addonsPaid ? addon.price : 0,
                payment_method: formData.payment_method || 'cash',
                notes: 'Added during membership signup'
              });
            }
            toast.success(
              addonsPaid
                ? `${selectedAddons.length} add-on(s) assigned and paid!`
                : `${selectedAddons.length} add-on(s) assigned to member!`
            );
          } catch (addonError) {
            console.error('Error assigning addons:', addonError);
            toast.warning('Member created but some add-ons could not be assigned.');
          }
        }

        // Send invoice via WhatsApp
        if (formData.plan_id) {
          try {
            const invoiceResponse = await api.post(`/gym/members/${savedMember.id}/send-invoice`);
            if (invoiceResponse?.data?.success) {
              toast.success('Invoice sent via WhatsApp!');
            } else {
              console.warn('WhatsApp invoice not sent:', invoiceResponse?.data?.message);
              toast('Member added. WhatsApp invoice could not be sent — check WhatsApp logs for details.', { icon: '⚠️' });
            }
          } catch (invoiceError) {
            console.error('Error sending invoice:', invoiceError);
            toast('Member added, but the invoice request failed. Check WhatsApp logs for details.', { icon: '⚠️' });
          }
        }
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const tabs = [
    { id: 'personal',   name: 'Personal',                                     icon: User      },
    { id: 'contact',    name: 'Contact',                                      icon: Phone     },
    { id: 'medical',    name: 'Medical',                                      icon: Heart     },
    { id: 'documents',  name: 'Documents',                                    icon: FileText  },
    { id: 'membership', name: isEdit ? 'Renew / Change Plan' : 'Membership',  icon: isEdit ? RefreshCw : CreditCard },
  ];

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white";
  const phoneKeyDown = (e) => {
    const nav = new Set(['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']);
    if (!e.ctrlKey && !e.metaKey && !nav.has(e.key) && !/^[0-9+\- ]$/.test(e.key)) e.preventDefault();
  };
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";
  const idProofOptions = [
    { value: 'aadhar',   label: 'Aadhar Card'      },
    { value: 'pan',      label: 'PAN Card'          },
    { value: 'dl',       label: 'Driving License'   },
    { value: 'passport', label: 'Passport'          },
    { value: 'voter',    label: 'Voter ID'          },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Member' : 'Add New Member'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit ? 'Update details or renew / change membership plan' : 'Register a new gym member'}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 flex-shrink-0 overflow-x-auto">
          <nav className="flex space-x-1 min-w-max">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                <tab.icon className="h-4 w-4" />
                {tab.name}
                {tab.id === 'membership' && formData.plan_id && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">

            {activeTab === 'personal' && (
              <div className="space-y-4">
                <PhotoUploader
                  memberId={isEdit ? member?.id : null}
                  currentPhotoUrl={isEdit ? member?.raw?.profile_image : null}
                  onPhotoUploaded={() => {}}
                  getPendingFileRef={isEdit ? null : getPendingFileRef}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.full_name} onChange={set('full_name')}
                      className={inputCls} placeholder="Enter full name" />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={formData.email} onChange={set('email')}
                      className={inputCls} placeholder="member@example.com" />
                  </div>
                  <div>
                    <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
                    <input type="tel" required value={formData.phone} onChange={set('phone')}
                      maxLength={15} onKeyDown={phoneKeyDown}
                      className={inputCls} placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className={labelCls}>Date of Birth</label>
                    <DOBPicker
                      value={formData.date_of_birth}
                      onChange={(val) => setFormData(prev => ({ ...prev, date_of_birth: val }))}
                      maxDate={today}
                    />
                    {formData.date_of_birth && (() => {
                      const dob = new Date(formData.date_of_birth + 'T00:00:00');
                      const now = new Date();
                      let age = now.getFullYear() - dob.getFullYear();
                      const mDiff = now.getMonth() - dob.getMonth();
                      if (mDiff < 0 || (mDiff === 0 && now.getDate() < dob.getDate())) age--;
                      return <p className="text-xs text-gray-400 mt-1.5">{age} years old</p>;
                    })()}
                  </div>
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select value={formData.gender} onChange={set('gender')} className={inputCls}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Address</label>
                    <textarea rows="2" value={formData.address} onChange={set('address')}
                      className={inputCls} placeholder="Full address" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Contact Name</label>
                    <input type="text" value={formData.emergency_contact_name}
                      onChange={set('emergency_contact_name')} className={inputCls}
                      placeholder="Emergency contact name" />
                  </div>
                  <div>
                    <label className={labelCls}>Contact Phone</label>
                    <input type="tel" value={formData.emergency_contact_phone}
                      onChange={set('emergency_contact_phone')} className={inputCls}
                      maxLength={15} onKeyDown={phoneKeyDown}
                      placeholder="+91 98765 43210" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'medical' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                  This information is confidential and used only for member safety.
                </div>
                {[
                  { key: 'medical_conditions', label: 'Medical Conditions', placeholder: 'e.g. Diabetes, Hypertension' },
                  { key: 'allergies',           label: 'Allergies',          placeholder: 'e.g. Peanuts, Latex'         },
                  { key: 'medications',         label: 'Current Medications', placeholder: 'List any regular medications' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <textarea rows="3" value={formData[key]}
                      onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder} className={inputCls} />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>ID Proof Type</label>
                    <select value={formData.id_proof_type} onChange={set('id_proof_type')} className={inputCls}>
                      {idProofOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>ID Proof Number</label>
                    <input type="text" value={formData.id_proof_number} onChange={set('id_proof_number')}
                      className={inputCls} placeholder="Enter ID number" />
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50 hover:bg-blue-50">
                  <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">Click to upload ID proof image</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>
            )}

            {activeTab === 'membership' && (
              <div className="space-y-5">
                {isEdit && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current Membership</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {member?.membership && member.membership !== 'No Plan'
                              ? member.membership
                              : <span className="text-gray-400 italic">No active plan</span>}
                          </p>
                          {member?.membershipEndDate && (
                            <p className="text-sm text-gray-500 mt-0.5">
                              Expires: {new Date(member.membershipEndDate).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'long', year: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                        {member?.membershipEndDate && (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            new Date(member.membershipEndDate) < new Date()
                              ? 'bg-red-100 text-red-700'
                              : new Date(member.membershipEndDate) < new Date(Date.now() + 7 * 86400000)
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {new Date(member.membershipEndDate) < new Date() ? 'Expired' :
                             new Date(member.membershipEndDate) < new Date(Date.now() + 7 * 86400000) ? 'Expiring soon' : 'Active'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900 text-sm">Renew or Change Plan</p>
                          <p className="text-xs text-blue-600 mt-0.5">Creates a new membership period for this member</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          renew_membership: !prev.renew_membership,
                          plan_id: '',
                          amount_paid: '',
                          custom_due_date: '',
                          payment_date: today,
                        }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          formData.renew_membership ? 'bg-blue-600' : 'bg-gray-200'
                        }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          formData.renew_membership ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                )}

                {(!isEdit || formData.renew_membership) && (
                  loadingPlans ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-sm">Loading plans...</p>
                    </div>
                  ) : (
                    <>
                      <MembershipSelector
                        formData={formData}
                        setFormData={setFormData}
                        membershipPlans={membershipPlans}
                        setMembershipPlans={setMembershipPlans}
                        showPlanCreator={showPlanCreator}
                        setShowPlanCreator={setShowPlanCreator}
                        inputCls={inputCls}
                        labelCls={labelCls}
                        onRefreshPlans={refreshMembershipPlans}
                        userManuallyChangedAmount={userManuallyChangedAmount}
                        setUserManuallyChangedAmount={setUserManuallyChangedAmount}
                        handleAmountChange={handleAmountChange}
                        amountError={amountError}
                        setAmountError={setAmountError}
                        isEdit={isEdit}
                        memberId={member?.id}
                        selectedPlanForChange={selectedPlanForChange}
                        setSelectedPlanForChange={setSelectedPlanForChange}
                        showPlanChangePreview={showPlanChangePreview}
                        setShowPlanChangePreview={setShowPlanChangePreview}
                      />

                      {/* ✅ Payment Date Picker - Show for renewal and new members */}
                      {(isEdit && formData.renew_membership || !isEdit) && (
                        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              Payment Received Date <span className="text-red-500">*</span>
                            </span>
                          </label>
                          <PaymentDatePicker
                            value={formData.payment_date}
                            onChange={(date) => setFormData(prev => ({ ...prev, payment_date: date }))}
                          />
                          <p className="text-xs text-gray-500 mt-1.5">
                            📅 The date when the payment was actually received (defaults to today)
                          </p>
                          <p className="text-xs text-blue-500 mt-1">
                            💡 Next Payment Due Date will be set to the membership expiry date
                          </p>
                        </div>
                      )}
                    </>
                  )
                )}

                {isEdit && !formData.renew_membership && (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Toggle the switch above to renew or change this member's plan.
                  </p>
                )}

                <PersonalTrainingSection 
                  formData={formData}
                  setFormData={setFormData}
                  trainers={trainers}
                  loadingTrainers={loadingTrainers}
                  isEdit={isEdit}
                />

                {(!isEdit || formData.renew_membership) && (
                  <AddonSelectionSection 
                    formData={formData}
                    setFormData={setFormData}
                    selectedAddons={selectedAddons}
                    setSelectedAddons={setSelectedAddons}
                    addons={addons}
                    loadingAddons={loadingAddons}
                    addonTotal={addonTotal}
                    setShowAddonManager={setShowAddonManager}
                    addonsPaid={addonsPaid}
                    setAddonsPaid={setAddonsPaid}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            <div className="flex items-center gap-1.5">
              {tabs.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} title={tab.name}
                  className={`rounded-full transition-all ${
                    activeTab === tab.id ? 'w-6 h-2.5 bg-blue-600' : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                  }`} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-medium">
                Cancel
              </button>
              {activeTab !== tabs[tabs.length - 1].id && (
                <button type="button"
                  onClick={() => {
                    const idx = tabs.findIndex(t => t.id === activeTab);
                    setActiveTab(tabs[idx + 1].id);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <button type="submit" disabled={saving || amountError}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  : <>{isEdit ? 'Save Changes' : 'Add Member'}</>}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Addon Manager Modal */}
      <AddonManager
        isOpen={showAddonManager}
        onClose={() => {
          setShowAddonManager(false);
          fetchAddons();
        }}
        onAddonAssigned={() => {
          fetchAddons();
        }}
      />
    </div>
  );
};

export default MemberModal;