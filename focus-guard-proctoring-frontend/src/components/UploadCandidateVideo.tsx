import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Upload, Trash2, FileVideo, User } from "lucide-react";
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

// IndexedDB helper functions
const DB_NAME = 'CandidateVideos';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

interface StoredVideo {
  id: string;
  name: string;
  blob: Blob;
  uploadDate: Date;
  size: number;
  duration?: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('uploadDate', 'uploadDate', { unique: false });
      }
    };
  });
};

const saveVideoToDB = async (video: StoredVideo): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.add(video);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const getVideosFromDB = async (): Promise<StoredVideo[]> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

const deleteVideoFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

function UploadCandidateVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [sessionStartTime] = useState(new Date());
  const [predictions, setPredictions] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<StoredVideo | null>(null);
  const [storedVideos, setStoredVideos] = useState<StoredVideo[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Detection states
  const [currentPersonCount, setCurrentPersonCount] = useState(0);
  const [currentMobileCount, setCurrentMobileCount] = useState(0);

  const {
    isModelLoaded,
    detections,
    focusMetrics,
    detectObjects,
    clearDetections,
  } = useObjectDetection();

  // Load stored videos on component mount
  useEffect(() => {
    loadStoredVideos();
  }, []);

  const loadStoredVideos = async () => {
    try {
      const videos = await getVideosFromDB();
      setStoredVideos(videos);
    } catch (error) {
      console.error('Failed to load stored videos:', error);
    }
  };

  // Detection loop
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && isModelLoaded && videoRef.current && selectedVideo) {
      interval = setInterval(async () => {
        const result = await detectObjects(videoRef.current!);
        if (result) {
          setPredictions(result.predictions);
          const personCount = result.personCount || 0;
          const mobileCount = result.mobileCount || 0;
          setCurrentPersonCount(personCount);
          setCurrentMobileCount(mobileCount);
        }
      }, 1000);
    } else {
      setCurrentPersonCount(0);
      setCurrentMobileCount(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isModelLoaded, detectObjects, selectedVideo]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a valid video file');
      return;
    }

    // Validate file size (20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size must be less than 20MB');
      return;
    }

    setUploadError(null);
    uploadVideo(file);
  };

  const uploadVideo = async (file: File) => {
    if (!candidateName.trim()) {
      setUploadError('Please enter candidate name');
      return;
    }

    setIsUploading(true);
    
    try {
      // Create video element to get duration
      const videoElement = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);
      
      videoElement.src = objectUrl;
      await new Promise((resolve) => {
        videoElement.addEventListener('loadedmetadata', resolve);
      });

      const storedVideo: StoredVideo = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: candidateName.trim(),
        blob: file,
        uploadDate: new Date(),
        size: file.size,
        duration: videoElement.duration,
      };

      await saveVideoToDB(storedVideo);
      await loadStoredVideos();
      
      // Auto-select the uploaded video
      setSelectedVideo(storedVideo);
      setVideoUrl(objectUrl);
      setCandidateName('');
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError('Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoSelect = async (videoId: string) => {
    const video = storedVideos.find(v => v.id === videoId);
    if (!video) return;

    // Revoke previous URL to prevent memory leaks
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const objectUrl = URL.createObjectURL(video.blob);
    setVideoUrl(objectUrl);
    setSelectedVideo(video);
    setIsPlaying(false);
    clearDetections();
    setCurrentPersonCount(0);
    setCurrentMobileCount(0);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      try {
        await deleteVideoFromDB(videoId);
        await loadStoredVideos();
        
        // If deleted video was selected, clear selection
        if (selectedVideo?.id === videoId) {
          setSelectedVideo(null);
          if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
            setVideoUrl(null);
          }
          setIsPlaying(false);
        }
      } catch (error) {
        console.error('Failed to delete video:', error);
      }
    }
  };

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

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Clean up video URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  if (!isModelLoaded) {
    return (
      <div className="max-h-screen flex items-center justify-center mt-10">
        <LoadingSpinner message="Initializing AI Detection Models..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-120px)]">
          {/* Video Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Upload Student Video
                  </h2>
                  {storedVideos.length > 0 && (
                    <Select 
                      onValueChange={handleVideoSelect}
                      value={selectedVideo?.id || ''}
                    >
                      <SelectTrigger className="w-fit">
                        <SelectValue placeholder="Select Video" />
                      </SelectTrigger>
                      <SelectContent>
                        {storedVideos.map(video => (
                          <SelectItem key={video.id} value={video.id}>
                            {video.name} ({formatFileSize(video.size)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  {/* Analysis status indicator */}
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isPlaying && selectedVideo ? "bg-green-500 animate-pulse" : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-sm text-gray-600">
                      {isPlaying && selectedVideo ? "Analyzing" : selectedVideo ? "Ready" : "No Video"}
                    </span>
                  </div>

                  {/* Real-time counts display */}
                  {isPlaying && selectedVideo && (
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

              {/* Upload Section */}
              {!selectedVideo && (
                <div className="mb-6 p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <FileVideo className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Video</h3>
                    
                    {/* Candidate Name Input */}
                    <div className="mb-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <label className="text-sm font-medium text-gray-700">
                          Candidate Name
                        </label>
                      </div>
                      <input
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Enter candidate's name"
                        className="max-w-xs mx-auto block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isUploading}
                      />
                    </div>

                    {/* File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isUploading}
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !candidateName.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Select Video
                        </>
                      )}
                    </button>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Maximum file size: 20MB • Supported formats: MP4, WebM, AVI, MOV
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Error */}
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{uploadError}</p>
                </div>
              )}

              {/* Video Player */}
              {selectedVideo && videoUrl && (
                <>
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                    <VideoPlayer
                      ref={videoRef}
                      src={videoUrl}
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
                  <div className="mb-4 space-y-2">
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

                  {/* Video Info */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-blue-900">
                          Candidate: {selectedVideo.name}
                        </span>
                        <span className="text-blue-700">
                          Size: {formatFileSize(selectedVideo.size)}
                        </span>
                        <span className="text-blue-700">
                          Uploaded: {selectedVideo.uploadDate.toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteVideo(selectedVideo.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center space-x-4">
                {selectedVideo && (
                  <>
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
                  </>
                )}

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

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center space-x-2 px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload New</span>
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
              videoTitle={selectedVideo ? `${selectedVideo.name} Analysis` : "No Video Selected"}
              currentPersonCount={currentPersonCount}
              currentMobileCount={currentMobileCount}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default UploadCandidateVideo;