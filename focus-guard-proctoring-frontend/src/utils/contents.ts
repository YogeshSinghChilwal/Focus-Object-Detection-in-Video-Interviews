export const DETECTION_CONFIG = {
  CONFIDENCE_THRESHOLD: 0.5,
  FACE_DETECTION_INTERVAL: 1000, // ms
  OBJECT_DETECTION_INTERVAL: 2000, // ms
  ABSENCE_THRESHOLD: 3, // seconds
  FOCUS_LOSS_THRESHOLD: 2, // seconds
  MAX_DETECTIONS_STORED: 100,
};

export const SUSPICIOUS_OBJECTS = [
  'cell phone',
  'laptop',
  'book',
  'bottle',
  'cup',
  'remote',
  'mouse',
  'keyboard',
  'tablet'
];

export const ALERT_MESSAGES = {
  no_face: 'Student not visible in frame',
  multiple_faces: 'Multiple people detected in frame',
  focus_lost: 'Student appears to be looking away',
  phone_detected: 'Mobile phone detected',
  device_detected: 'Electronic device detected',
  book_detected: 'Book or reading material detected',
};