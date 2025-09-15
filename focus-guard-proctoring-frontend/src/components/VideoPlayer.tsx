import React, { useRef, useEffect, forwardRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  isPlaying: boolean;
  isMuted: boolean;
  onPlayToggle: () => void;
  onMuteToggle: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({
  src,
  isPlaying,
  isMuted,
  onPlayToggle,
  onMuteToggle,
  onTimeUpdate,
}, ref) => {
  const localRef = useRef<HTMLVideoElement>(null);
  const videoRef = ref || localRef;

  useEffect(() => {
    const video = (videoRef as React.RefObject<HTMLVideoElement>).current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime, video.duration);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoRef, onTimeUpdate]);

  useEffect(() => {
    const video = (videoRef as React.RefObject<HTMLVideoElement>).current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [isPlaying, videoRef]);

  useEffect(() => {
    const video = (videoRef as React.RefObject<HTMLVideoElement>).current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted, videoRef]);

  return (
    <div className="relative group">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover rounded-lg"
        playsInline
        crossOrigin="anonymous"
      />
      
      {/* Controls Overlay */}
      <div className="absolute inset-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg">
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center space-x-3">
            <button
              onClick={onPlayToggle}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200 shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-gray-800" />
              ) : (
                <Play className="w-5 h-5 text-gray-800 ml-1" />
              )}
            </button>
            
            <button
              onClick={onMuteToggle}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200 shadow-lg"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-gray-800" />
              ) : (
                <Volume2 className="w-5 h-5 text-gray-800" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;