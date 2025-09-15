import type { FocusMetrics } from '@/types/detection';
import React from 'react';

interface DetectionOverlayProps {
  predictions: any[];
  focusMetrics: FocusMetrics;
}

const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  focusMetrics,
}) => {
  

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Focus Metrics Overlay */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-80 rounded-lg p-4 text-white min-w-48">
        <h3 className="font-semibold mb-2 text-sm">Focus Analysis</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Focus Score:</span>
            <span className={`font-medium ${getScoreColor(focusMetrics.focusScore)}`}>
              {focusMetrics.focusScore}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Eye Contact:</span>
            <span className={`font-medium ${getScoreColor(focusMetrics.eyeContactScore)}`}>
              {focusMetrics.eyeContactScore}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Head Pose:</span>
            <span className={`font-medium ${getScoreColor(focusMetrics.headPoseScore)}`}>
              {focusMetrics.headPoseScore}%
            </span>
          </div>
          <div className="border-t border-gray-600 pt-1 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Overall:</span>
              <span className={getScoreColor(focusMetrics.overallAttention)}>
                {focusMetrics.overallAttention}%
              </span>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
};

export default DetectionOverlay;