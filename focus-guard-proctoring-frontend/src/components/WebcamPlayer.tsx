import { useRef, useEffect, useCallback } from "react";
import { CameraOff } from "lucide-react";

const WebcamPlayer = ({
  videoRef,
  isActive,
  onStreamReady,
  onStreamError,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  onStreamReady: () => void;
  onStreamError: (error: string) => void;
}) => {
  const streamRef = useRef<MediaStream | null>(null);
  const isInitializing = useRef(false);

  const startWebcam = useCallback(async () => {
    // Prevent multiple simultaneous initialization attempts
    if (isInitializing.current || streamRef.current) {
      return;
    }

    isInitializing.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user",
        },
        audio: false, // We don't need audio for detection
      });

      // Check if component is still mounted and active
      if (!isActive) {
        stream.getTracks().forEach((track) => track.stop());
        isInitializing.current = false;
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready before calling onStreamReady
        const handleLoadedData = () => {
          videoRef.current?.removeEventListener("loadeddata", handleLoadedData);
          onStreamReady();
          isInitializing.current = false;
        };

        videoRef.current.addEventListener("loadeddata", handleLoadedData);
        await videoRef.current.play();
      } else {
        isInitializing.current = false;
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
      isInitializing.current = false;
      let errorMessage = "Failed to access camera. ";

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage += "Please allow camera permissions and try again.";
        } else if (error.name === "NotFoundError") {
          errorMessage += "No camera found on this device.";
        } else if (error.name === "NotReadableError") {
          errorMessage += "Camera is being used by another application.";
        } else {
          errorMessage += "Please check your camera settings.";
        }
      }

      onStreamError(errorMessage);
    }
  }, [videoRef, onStreamReady, onStreamError, isActive]);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    isInitializing.current = false;
  }, [videoRef]);

  useEffect(() => {
    if (isActive && !streamRef.current && !isInitializing.current) {
      startWebcam();
    } else if (!isActive && streamRef.current) {
      stopWebcam();
    }

    return () => {
      if (streamRef.current) {
        stopWebcam();
      }
    };
  }, [isActive]); // Simplified dependencies to avoid re-creating functions

  return (
    <div className="relative group h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-lg mirror"
        autoPlay
        playsInline
        muted
        style={{ transform: "scaleX(-1)" }} // Mirror effect for natural viewing
      />

      {!isActive && (
        <div className="absolute inset-0 bg-gray-600/40 rounded-lg flex items-center justify-center ">
          <div className="text-center text-white">
            <CameraOff className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Camera Off</p>
            <p className="text-sm text-gray-300 mt-2">
              Click "Start Camera" to begin
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebcamPlayer;
