import { useRef, useCallback, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import type { Detection, FocusMetrics } from "@/types/detection";

export const useObjectDetection = () => {
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [focusMetrics, setFocusMetrics] = useState<FocusMetrics>({
    focusScore: 100,
    eyeContactScore: 100,
    headPoseScore: 100,
    overallAttention: 100,
  });

  // Enhanced detection history for better tracking
  const detectionHistoryRef = useRef<
    Array<{ timestamp: number; predictions: any[] }>
  >([]);
  const lastDetectionTimeRef = useRef<number>(0);

  // Mobile-specific tracking for improved detection
  const mobileDetectionHistory = useRef<
    Array<{ timestamp: number; bbox: number[]; confidence: number }>
  >([]);
  const isDetecting = useRef(false);

  const loadModel = useCallback(async () => {
    try {
      console.log("Loading TensorFlow.js model...");

      // Set backend preference order for best performance
      const backends = ["webgl", "webgpu", "cpu"];
      let modelLoaded = false;

      for (const backend of backends) {
        try {
          await tf.setBackend(backend);
          await tf.ready();
          console.log(`Using ${backend} backend`);

          // Load model with optimized configuration
          const model = await cocoSsd.load({
            base: "mobilenet_v2", // Best balance of speed and accuracy
            modelUrl: undefined, // Use default CDN
          });

          modelRef.current = model;
          setIsModelLoaded(true);
          modelLoaded = true;
          console.log(`Model loaded successfully with ${backend} backend`);
          break;
        } catch (error) {
          console.warn(`Failed to load with ${backend} backend:`, error);
          continue;
        }
      }

      if (!modelLoaded) {
        throw new Error("Failed to load model with any backend");
      }
    } catch (error) {
      console.error("Failed to load model:", error);
      setIsModelLoaded(false);
    }
  }, []);

  // Enhanced preprocessing specifically optimized for mobile detection
  const preprocessVideo = useCallback(
    (videoElement: HTMLVideoElement): HTMLCanvasElement | null => {
      if (!videoElement || videoElement.readyState < 2) return null;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Set optimal resolution for detection (balance between speed and accuracy)
      const maxSize = 640;
      const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;

      if (aspectRatio > 1) {
        canvas.width = Math.min(maxSize, videoElement.videoWidth);
        canvas.height = canvas.width / aspectRatio;
      } else {
        canvas.height = Math.min(maxSize, videoElement.videoHeight);
        canvas.width = canvas.height * aspectRatio;
      }

      // Apply image enhancement specifically for better mobile device detection
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw the frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Enhanced preprocessing for mobile detection
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply enhanced contrast and sharpening for better edge detection (helps with phone shapes)
      const contrast = 1.15; // Slightly higher contrast for mobile devices
      const brightness = 8;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, contrast * data[i] + brightness)); // Red
        data[i + 1] = Math.min(
          255,
          Math.max(0, contrast * data[i + 1] + brightness)
        ); // Green
        data[i + 2] = Math.min(
          255,
          Math.max(0, contrast * data[i + 2] + brightness)
        ); // Blue
      }

      ctx.putImageData(imageData, 0, 0);
      return canvas;
    },
    []
  );

  // Enhanced mobile-specific detection validation
  const validateMobileDetection = useCallback((prediction: any): boolean => {
    const [width, height] = prediction.bbox;
    const aspectRatio = width / height;

    // Mobile phones typically have aspect ratios between 0.4 and 0.7 (portrait) or 1.4-2.5 (landscape)
    const isValidAspectRatio =
      (aspectRatio >= 0.35 && aspectRatio <= 0.75) ||
      (aspectRatio >= 1.4 && aspectRatio <= 2.8);

    // Mobile phones should have minimum size (avoid tiny false positives)
    const minArea = 1200; // Minimum pixel area for mobile detection
    const area = width * height;
    const hasValidSize = area >= minArea;

    // Enhanced confidence threshold for mobile devices
    const hasValidConfidence = prediction.score >= 0.25; // Lower threshold but with other validations

    return isValidAspectRatio && hasValidSize && hasValidConfidence;
  }, []);

  // Enhanced Non-Maximum Suppression with mobile-specific improvements
  const applyNMS = useCallback(
    (predictions: any[], iouThreshold: number = 0.25): any[] => {
      if (predictions.length <= 1) return predictions;

      // Separate mobile and non-mobile predictions for different handling
      const mobilePreds = predictions.filter((p) => p.class === "cell phone");
      const otherPreds = predictions.filter((p) => p.class !== "cell phone");

      // Apply stricter NMS for mobile devices (lower IoU threshold to catch overlapping detections)
      const processPredictions = (preds: any[], threshold: number) => {
        const sorted = [...preds].sort((a, b) => b.score - a.score);
        const keep: any[] = [];
        const suppressed = new Set<number>();

        for (let i = 0; i < sorted.length; i++) {
          if (suppressed.has(i)) continue;

          keep.push(sorted[i]);

          for (let j = i + 1; j < sorted.length; j++) {
            if (suppressed.has(j)) continue;

            const iou = calculateIoU(sorted[i].bbox, sorted[j].bbox);
            if (iou > threshold && sorted[i].class === sorted[j].class) {
              suppressed.add(j);
            }
          }
        }

        return keep;
      };

      // Apply different thresholds for mobile vs other objects
      const filteredMobile = processPredictions(mobilePreds, 0.2); // Stricter for mobiles
      const filteredOther = processPredictions(otherPreds, iouThreshold);

      return [...filteredMobile, ...filteredOther];
    },
    []
  );

  // Calculate Intersection over Union for NMS
  const calculateIoU = useCallback(
    (bbox1: number[], bbox2: number[]): number => {
      const [x1, y1, w1, h1] = bbox1;
      const [x2, y2, w2, h2] = bbox2;

      const x1_max = x1 + w1;
      const y1_max = y1 + h1;
      const x2_max = x2 + w2;
      const y2_max = y2 + h2;

      const intersect_x1 = Math.max(x1, x2);
      const intersect_y1 = Math.max(y1, y2);
      const intersect_x2 = Math.min(x1_max, x2_max);
      const intersect_y2 = Math.min(y1_max, y2_max);

      if (intersect_x2 <= intersect_x1 || intersect_y2 <= intersect_y1) {
        return 0;
      }

      const intersect_area =
        (intersect_x2 - intersect_x1) * (intersect_y2 - intersect_y1);
      const bbox1_area = w1 * h1;
      const bbox2_area = w2 * h2;
      const union_area = bbox1_area + bbox2_area - intersect_area;

      return intersect_area / union_area;
    },
    []
  );

  // Enhanced temporal smoothing with mobile-specific tracking
  const applyTemporalSmoothing = useCallback(
    (currentPredictions: any[]): any[] => {
      const now = Date.now();
      const historyWindow = 600; // 600ms window for better mobile tracking

      // Add current predictions to history
      detectionHistoryRef.current.push({
        timestamp: now,
        predictions: currentPredictions,
      });

      // Remove old history
      detectionHistoryRef.current = detectionHistoryRef.current.filter(
        (entry) => now - entry.timestamp <= historyWindow
      );

      // Update mobile-specific history
      const mobilePreds = currentPredictions.filter(
        (p) => p.class === "cell phone"
      );
      mobilePreds.forEach((pred) => {
        mobileDetectionHistory.current.push({
          timestamp: now,
          bbox: pred.bbox,
          confidence: pred.score,
        });
      });

      // Clean mobile history
      mobileDetectionHistory.current = mobileDetectionHistory.current.filter(
        (entry) => now - entry.timestamp <= historyWindow
      );

      if (detectionHistoryRef.current.length < 2) {
        return currentPredictions;
      }

      // Group similar detections across time with enhanced mobile tracking
      const smoothedPredictions: any[] = [];

      for (const prediction of currentPredictions) {
        const similarDetections = detectionHistoryRef.current
          .flatMap((entry) => entry.predictions)
          .filter((pred) => {
            if (pred.class !== prediction.class) return false;

            const iouThreshold = pred.class === "cell phone" ? 0.4 : 0.5; // Lower threshold for mobiles
            return calculateIoU(pred.bbox, prediction.bbox) > iouThreshold;
          });

        if (similarDetections.length >= 2) {
          // Average the confidence and position with mobile-specific boosting
          const avgScore =
            similarDetections.reduce((sum, pred) => sum + pred.score, 0) /
            similarDetections.length;
          const avgBbox = [0, 1, 2, 3].map(
            (i) =>
              similarDetections.reduce((sum, pred) => sum + pred.bbox[i], 0) /
              similarDetections.length
          );

          // Boost mobile detection confidence if consistently detected
          const confidenceBoost =
            prediction.class === "cell phone" ? 1.15 : 1.1;

          smoothedPredictions.push({
            ...prediction,
            score: Math.min(1, avgScore * confidenceBoost),
            bbox: avgBbox,
          });
        } else {
          smoothedPredictions.push(prediction);
        }
      }

      return smoothedPredictions;
    },
    [calculateIoU]
  );

  const detectObjects = useCallback(
    async (videoElement: HTMLVideoElement) => {
      if (
        !modelRef.current ||
        !videoElement ||
        videoElement.readyState < 2 ||
        isDetecting.current
      ) {
        return null;
      }

      // Throttle detection for better performance
      const now = Date.now();
      if (now - lastDetectionTimeRef.current < 100) {
        // Max 10 FPS
        return null;
      }
      lastDetectionTimeRef.current = now;

      try {
        isDetecting.current = true;

        // Preprocess video for better detection
        const processedCanvas = preprocessVideo(videoElement);
        const inputElement = processedCanvas || videoElement;

        // Ensure input is ready for detection
        if (
          inputElement === videoElement &&
          (videoElement.videoWidth === 0 || videoElement.videoHeight === 0)
        ) {
          return null;
        }

        const predictions = await modelRef.current.detect(inputElement);

        // Enhanced filtering with mobile-specific validation
        const relevantClasses = {
          "cell phone": 0.25, // Lower threshold for mobile with additional validation
          person: 0.5,
          laptop: 0.6,
          tablet: 0.5,
          book: 0.3,
          bottle: 0.4,
          cup: 0.4,
          mouse: 0.5,
          keyboard: 0.6,
          remote: 0.4,
          tv: 0.6,
          monitor: 0.6,
        };

        const filteredPredictions = predictions.filter((pred) => {
          const threshold =
            relevantClasses[pred.class as keyof typeof relevantClasses] || 0.5;
          const meetsThreshold = pred.score >= threshold;

          // Apply additional validation for mobile devices
          if (pred.class === "cell phone") {
            return meetsThreshold && validateMobileDetection(pred);
          }

          return meetsThreshold;
        });

        // Apply Non-Maximum Suppression with mobile-specific handling
        const nmsFiltered = applyNMS(filteredPredictions, 0.3);

        // Apply temporal smoothing with enhanced mobile tracking
        const smoothedPredictions = applyTemporalSmoothing(nmsFiltered);

        const currentTime = new Date();
        const newDetections: Detection[] = [];

        smoothedPredictions.forEach((prediction, index) => {
          const detectionType = getDetectionType(prediction.class);

          if (detectionType) {
            const detection: Detection = {
              id: `${currentTime.getTime()}-${index}`,
              timestamp: currentTime,
              type: detectionType,
              confidence: prediction.score,
              bbox: {
                x: prediction.bbox[0],
                y: prediction.bbox[1],
                width: prediction.bbox[2],
                height: prediction.bbox[3],
              },
              description: `${prediction.class} detected with ${(
                prediction.score * 100
              ).toFixed(1)}% confidence`,
            };

            newDetections.push(detection);
          }
        });

        // Enhanced focus metrics calculation with improved mobile detection impact
        const personDetections = smoothedPredictions.filter(
          (p) => p.class === "person"
        );
        const mobileDevices = smoothedPredictions.filter(
          (p) => p.class === "cell phone"
        );
        const computerDevices = smoothedPredictions.filter((p) =>
          ["laptop", "tablet", "keyboard", "mouse", "monitor"].includes(p.class)
        );
        const distractingObjects = smoothedPredictions.filter((p) =>
          ["bottle", "cup", "book", "remote", "tv"].includes(p.class)
        );

        // TODO Make it better for Focus Score
        // Advanced focus score calculation with enhanced mobile penalty
        let focusScore = 80;

        // Enhanced penalties for mobile devices with confidence-based scaling
        focusScore -= mobileDevices.reduce((penalty, device) => {
          // Higher penalty for more confident mobile detections
          const basePenalty = 35;
          const confidenceMultiplier = Math.min(1.5, device.score * 1.5);
          return penalty + basePenalty * confidenceMultiplier;
        }, 0);

        focusScore -= computerDevices.reduce(
          (penalty, device) => penalty + device.score * 15,
          0
        );
        focusScore -= distractingObjects.reduce(
          (penalty, obj) => penalty + obj.score * 8,
          0
        );

        // Bonus for stable person detection
        if (personDetections.length === 1 && personDetections[0].score > 0.7) {
          focusScore += 5;
        }

        focusScore = Math.max(0, Math.min(100, focusScore));

        // Enhanced eye contact score
        let eyeContactScore = 100;
        if (personDetections.length === 0) {
          eyeContactScore = 20;
        } else if (personDetections.length === 1) {
          const person = personDetections[0];
          const centeredness =
            1 -
            Math.abs(
              (person.bbox[0] + person.bbox[2] / 2) / inputElement.width - 0.5
            );
          eyeContactScore = Math.min(
            100,
            60 + person.score * 25 + centeredness * 15
          );

          // Penalty for mobile usage during eye contact
          if (mobileDevices.length > 0) {
            eyeContactScore -= 20;
          }
        } else {
          eyeContactScore = Math.max(
            30,
            100 - (personDetections.length - 1) * 25
          );
        }

        // Enhanced head pose score
        let headPoseScore = 60;
        if (personDetections.length === 1) {
          const person = personDetections[0];
          const faceSize =
            (person.bbox[2] * person.bbox[3]) /
            (inputElement.width * inputElement.height);
          const sizeScore = Math.min(40, faceSize * 1000);
          headPoseScore = Math.min(100, 50 + person.score * 30 + sizeScore);

          // Additional penalty for mobile usage affecting head pose
          if (mobileDevices.length > 0) {
            headPoseScore -= 15;
          }
        }

        const newFocusMetrics: FocusMetrics = {
          focusScore: Math.round(focusScore),
          eyeContactScore: Math.round(eyeContactScore),
          headPoseScore: Math.round(headPoseScore),
          overallAttention: Math.round(
            (focusScore + eyeContactScore + headPoseScore) / 3
          ),
        };

        setFocusMetrics(newFocusMetrics);

        if (newDetections.length > 0) {
          setDetections((prev) => {
            const updated = [...prev, ...newDetections];
            return updated.slice(-50); // Keep last 50 detections
          });
        }

        // Clean up canvas if created
        if (processedCanvas) {
          processedCanvas.remove();
        }

        return {
          predictions: smoothedPredictions,
          newDetections,
          mobileCount: mobileDevices.length,
          personCount: personDetections.length,
          totalDevices: mobileDevices.length + computerDevices.length,
        };
      } catch (error) {
        console.error("Detection error:", error);
        return null;
      } finally {
        isDetecting.current = false;
      }
    },
    [
      preprocessVideo,
      applyNMS,
      applyTemporalSmoothing,
      calculateIoU,
      validateMobileDetection,
    ]
  );

  const getDetectionType = useCallback(
    (className: string): Detection["type"] | null => {
      const lowerClass = className.toLowerCase();
      if (lowerClass.includes("phone") || lowerClass.includes("cell"))
        return "mobile";
      if (lowerClass === "person") return "person";
      if (
        lowerClass.includes("laptop") ||
        lowerClass.includes("tablet") ||
        lowerClass.includes("keyboard") ||
        lowerClass.includes("mouse") ||
        lowerClass.includes("monitor") ||
        lowerClass.includes("tv")
      )
        return "unknown_object";
      return "unknown_object";
    },
    []
  );

  const clearDetections = useCallback(() => {
    setDetections([]);
    detectionHistoryRef.current = [];
    mobileDetectionHistory.current = [];
    setFocusMetrics({
      focusScore: 100,
      eyeContactScore: 100,
      headPoseScore: 100,
      overallAttention: 100,
    });
  }, []);

  useEffect(() => {
    loadModel();

    return () => {
      if (modelRef.current) {
        modelRef.current.dispose?.();
      }
      // Clean up TensorFlow resources
      tf.disposeVariables();
    };
  }, [loadModel]);

  return {
    isModelLoaded,
    detections,
    focusMetrics,
    detectObjects,
    clearDetections,
  };
};
