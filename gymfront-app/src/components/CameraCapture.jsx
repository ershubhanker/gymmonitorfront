import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Loader2, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

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

export default CameraCapture;

