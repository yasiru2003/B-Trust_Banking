import React, { useRef, useState, useEffect } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

const CameraCapture = ({ onCapture, onClose, isOpen }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // Front camera for selfies
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    setIsCapturing(true);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsCapturing(false);
  };

  const confirmPhoto = () => {
    if (capturedImage && onCapture) {
      onCapture(capturedImage);
      stopCamera();
      onClose();
    }
  };

  const cancelCapture = () => {
    setCapturedImage(null);
    setIsCapturing(false);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Capture Customer Photo</h3>
          <button
            onClick={cancelCapture}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="relative">
          {!isCapturing ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 bg-gray-200 rounded-lg object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-64 bg-gray-200 rounded-lg object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex justify-center space-x-4 mt-6">
          {!isCapturing ? (
            <>
              <button
                onClick={capturePhoto}
                className="btn btn-primary flex items-center space-x-2"
                disabled={!stream}
              >
                <Camera className="h-4 w-4" />
                <span>Capture Photo</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={retakePhoto}
                className="btn btn-outline flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retake</span>
              </button>
              <button
                onClick={confirmPhoto}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Check className="h-4 w-4" />
                <span>Use Photo</span>
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            {!isCapturing 
              ? "Position the customer's face in the frame and click capture"
              : "Review the photo and click 'Use Photo' to confirm or 'Retake' to try again"
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;










