import { useState, useRef, useEffect } from "react";
import { Video, VideoOff, CameraOff } from "lucide-react";
import DetectionOverlay from "./DetectionOverlay";
import DetectionLogs from "./DetectionLogs";
import LoadingSpinner from "./LoadingSpinner";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import WebcamPlayer from "./WebcamPlayer";

function LiveCandidateVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [sessionStartTime] = useState(new Date());
  const [predictions, setPredictions] = useState<any[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Add state for real-time counts
  const [currentPersonCount, setCurrentPersonCount] = useState(0);
  const [currentMobileCount, setCurrentMobileCount] = useState(0);

  const {
    isModelLoaded,
    detections,
    focusMetrics,
    detectObjects,
    clearDetections,
  } = useObjectDetection();

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isStreaming) {
      interval = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming]);

  // Detection loop for live stream
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isStreaming && isModelLoaded && videoRef.current) {
      interval = setInterval(async () => {
        const result = await detectObjects(videoRef.current!);
        if (result) {
          setPredictions(result.predictions);

          // Update real-time counts from detection results
          const personCount = result.personCount || 0;
          const mobileCount = result.mobileCount || 0;

          setCurrentPersonCount(personCount);
          setCurrentMobileCount(mobileCount);
        }
      }, 1000); // Run detection every second for live stream
    } else {
      // Reset counts when not streaming
      setCurrentPersonCount(0);
      setCurrentMobileCount(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, isModelLoaded, detectObjects]);

  const handleStreamToggle = () => {
    if (isStreaming) {
      setIsStreaming(false);
      setStreamError(null);
      // Reset session data
      clearDetections();
      setCurrentPersonCount(0);
      setCurrentMobileCount(0);
      setSessionDuration(0);
    } else {
      setIsStreaming(true);
      setStreamError(null);
    }
  };

  const handleStreamReady = () => {
    console.log("Webcam stream is ready");
    setStreamError(null);
  };

  const handleStreamError = (error: string) => {
    setStreamError(error);
    setIsStreaming(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Check for camera permissions
  const checkCameraPermissions = async () => {
    try {
      const result = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      return result.state;
    } catch (error) {
      console.warn("Could not check camera permissions:", error);
      return "prompt";
    }
  };

  if (!isModelLoaded) {
    return (
      <div className="max-h-screen flex items-center justify-center mt-10">
        <LoadingSpinner message="Initializing AI Detection Models..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-120px)]">
          {/* Video Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Live Monitor
                  </h2>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Live status indicator */}
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isStreaming ? "bg-red-500 animate-pulse" : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-sm text-gray-600">
                      {isStreaming ? "LIVE" : "Offline"}
                    </span>
                  </div>

                  {/* Session duration */}
                  {isStreaming && (
                    <div className="text-sm text-gray-600">
                      Session: {formatTime(sessionDuration)}
                    </div>
                  )}

                  {/* Real-time counts display */}
                  {isStreaming && (
                    <div className="flex items-center space-x-3 text-sm">
                      <span
                        className={`font-medium ${
                          currentPersonCount === 1
                            ? "text-green-600"
                            : currentPersonCount === 0
                            ? "text-yellow-600"
                            : "text-orange-600"
                        }`}
                      >
                        👥 {currentPersonCount}
                      </span>
                      <span
                        className={`font-medium ${
                          currentMobileCount === 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        📱 {currentMobileCount}
                      </span>
                      <span
                        className={`font-medium ${
                          focusMetrics.focusScore >= 80
                            ? "text-green-600"
                            : focusMetrics.focusScore >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        🎯 {focusMetrics.focusScore}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Camera Error Display */}
              {streamError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <CameraOff className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-red-700 text-sm">{streamError}</span>
                  </div>
                </div>
              )}

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <WebcamPlayer
                  videoRef={videoRef}
                  isActive={isStreaming}
                  onStreamReady={handleStreamReady}
                  onStreamError={handleStreamError}
                />

                {isStreaming && (
                  <DetectionOverlay
                    predictions={predictions}
                    focusMetrics={focusMetrics}
                  />
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-4 mt-4">
                <button
                  onClick={handleStreamToggle}
                  disabled={streamError !== null}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                    isStreaming
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                  }`}
                >
                  {isStreaming ? (
                    <>
                      <VideoOff className="w-5 h-5" />
                      <span>Stop Camera</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      <span>Start Camera</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    clearDetections();
                    setCurrentPersonCount(0);
                    setCurrentMobileCount(0);
                  }}
                  className="px-4 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors text-sm"
                >
                  Clear Logs
                </button>

                {/* Manual detection test */}
                {isStreaming && (
                  <button
                    onClick={async () => {
                      if (videoRef.current && isModelLoaded) {
                        const result = await detectObjects(videoRef.current);
                        console.log("Manual detection result:", result);
                      }
                    }}
                    className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm"
                  >
                    Test Detection
                  </button>
                )}

                {/* Camera permissions info */}
                <button
                  onClick={async () => {
                    const permission = await checkCameraPermissions();
                    alert(`Camera permission: ${permission}`);
                  }}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                >
                  Check Permissions
                </button>
              </div>

              {/* Live stream info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600 font-medium">
                    Live Stream Info:
                  </span>
                  <div className="flex space-x-4 text-blue-700">
                    <span>Status: {isStreaming ? "Active" : "Inactive"}</span>
                    <span>Quality: {isStreaming ? "HD" : "N/A"}</span>
                    <span>
                      Detection: {isModelLoaded ? "Ready" : "Loading..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detection Logs Section - Reusing existing component */}
          <div className="lg:col-span-1">
            <DetectionLogs
              detections={detections}
              sessionStartTime={sessionStartTime}
              focusMetrics={focusMetrics}
              videoTitle="Live Monitoring"
              currentPersonCount={currentPersonCount}
              currentMobileCount={currentMobileCount}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default LiveCandidateVideo;
