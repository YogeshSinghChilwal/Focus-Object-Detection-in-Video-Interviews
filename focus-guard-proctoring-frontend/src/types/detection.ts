export interface Detection {
  id: string;
  timestamp: Date;
  type: 'mobile' | 'person' | 'focus_lost' | 'multiple_people' | 'unknown_object';
  confidence: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  description: string;
}

export interface FocusMetrics {
  focusScore: number;
  eyeContactScore: number;
  headPoseScore: number;
  overallAttention: number;
}

export interface DetectionStats {
  totalDetections: number;
  mobileDetections: number;
  personDetections: number;
  focusViolations: number;
  sessionDuration: number;
  averageFocusScore: number;
}