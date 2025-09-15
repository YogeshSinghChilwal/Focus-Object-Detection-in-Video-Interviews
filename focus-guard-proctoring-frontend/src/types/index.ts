export interface DetectionEvent {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  duration?: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const createDetectionEvent = (
  id: string,
  type: string,
  message: string,
  severity: 'low' | 'medium' | 'high',
  duration?: number,
  bbox?: { x: number; y: number; width: number; height: number }
): DetectionEvent => ({
  id,
  type,
  message,
  severity,
  timestamp: new Date(),
  duration,
  bbox,
});