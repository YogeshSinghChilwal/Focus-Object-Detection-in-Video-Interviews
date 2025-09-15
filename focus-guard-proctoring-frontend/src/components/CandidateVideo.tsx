import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import DetectionOverlay from "./DetectionOverlay";
import DetectionLogs from "./DetectionLogs";
import LoadingSpinner from "./LoadingSpinner";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import v1 from "@/assets/videos/v1.mp4";
import v2 from "@/assets/videos/v2.mp4";
import v3 from "@/assets/videos/v3.mp4";

function CandidateVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [sessionStartTime] = useState(new Date());
  const [predictions, setPredictions] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSrc, setVideoSrc] = useState(v1);

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

  // Sample video URL - in production, this would come from your video storage

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && isModelLoaded && videoRef.current) {
      interval = setInterval(async () => {
        const result = await detectObjects(videoRef.current!);
        if (result) {
          setPredictions(result.predictions);

          // Update real-time counts from detection results
          const personCount = result.personCount || 0;
          const mobileCount = result.mobileCount || 0;

          setCurrentPersonCount(personCount);
          setCurrentMobileCount(mobileCount);

          // Optional: Log the counts for debugging
          console.log(
            `Detection Update - People: ${personCount}, Mobiles: ${mobileCount}`
          );
        }
      }, 1000); // Run detection every second
    } else {
      // Reset counts when not playing
      setCurrentPersonCount(0);
      setCurrentMobileCount(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isModelLoaded, detectObjects]);

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = (current: number, total: number) => {
    setCurrentTime(current);
    setDuration(total);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isModelLoaded) {
    return (
      <div className="max-h-screen flex items-center justify-center mt-10">
        <LoadingSpinner message="Initializing AI Detection Models..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen  bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
          {/* Video Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Student Video Feed
                  </h2>
                  <Select onValueChange={(value) => setVideoSrc(value)}>
                    <SelectTrigger className="w-fit">
                      <SelectValue placeholder="Change Candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={v1}>Yogesh</SelectItem>
                      <SelectItem value={v2}>Arvind</SelectItem>
                      <SelectItem value={v3}>Shrimali</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Live status indicator */}
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isPlaying ? "bg-green-500 animate-pulse" : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-sm text-gray-600">
                      {isPlaying ? "Live Analysis" : "Paused"}
                    </span>
                  </div>

                  {/* Real-time counts display */}
                  {isPlaying && (
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

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <VideoPlayer
                  ref={videoRef}
                  src={videoSrc}
                  isPlaying={isPlaying}
                  isMuted={isMuted}
                  onPlayToggle={handlePlayToggle}
                  onMuteToggle={handleMuteToggle}
                  onTimeUpdate={handleTimeUpdate}
                />

                <DetectionOverlay
                  predictions={predictions}
                  focusMetrics={focusMetrics}
                />
              </div>

              {/* Progress Bar */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-4 mt-4">
                <button
                  onClick={handlePlayToggle}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  onClick={handleMuteToggle}
                  className="flex items-center space-x-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={() => {
                    clearDetections();
                    setCurrentPersonCount(0);
                    setCurrentMobileCount(0);
                  }}
                  className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm"
                >
                  Clear Logs
                </button>

                {/* Test detection button for debugging */}
                <button
                  onClick={async () => {
                    if (videoRef.current && isModelLoaded) {
                      const result = await detectObjects(videoRef.current);
                      console.log("Manual detection result:", result);
                    }
                  }}
                  className="px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm"
                >
                  Test Detection
                </button>
              </div>
            </div>
          </div>

          {/* Detection Logs Section */}
          <div className="lg:col-span-1">
            <DetectionLogs
              detections={detections}
              sessionStartTime={sessionStartTime}
              focusMetrics={focusMetrics}
              videoTitle="Student Video Analysis"
              currentPersonCount={currentPersonCount}
              currentMobileCount={currentMobileCount}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default CandidateVideo;
