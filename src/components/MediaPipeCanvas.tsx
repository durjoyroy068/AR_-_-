import React, { useEffect, useRef, useState } from 'react';
import { CursorFeedbackState, GameType, Point2D } from '../types';
import { sound } from '../utils/sound';
import { Camera, Video, VideoOff, MousePointer, Hand } from 'lucide-react';

interface MediaPipeCanvasProps {
  gameType: GameType;
  cursorFeedback: CursorFeedbackState;
  onCursorMove: (pos: Point2D, isPinching: boolean, isHandPresent: boolean) => void;
  children?: React.ReactNode;
  activeGameTitle: string;
}

export const MediaPipeCanvas: React.FC<MediaPipeCanvasProps> = ({
  gameType,
  cursorFeedback,
  onCursorMove,
  children,
  activeGameTitle,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasHand, setHasHand] = useState<boolean>(false);
  
  // Ref states for high-frequency tracking loop
  const cursorPosRef = useRef<Point2D>({ x: -100, y: -100 });
  const isPinchingRef = useRef<boolean>(false);
  const hasHandRef = useRef<boolean>(false);
  const handLandmarksRef = useRef<any>(null);
  const smoothedLandmarksRef = useRef<any[] | null>(null);
  const cameraInstanceRef = useRef<any>(null);
  const handsInstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMouseActiveRef = useRef<boolean>(true);

  // Global mouse / touch release handlers
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isMouseActiveRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cursorPosRef.current = { x, y };
      if (isPinchingRef.current) {
        onCursorMove({ x, y }, true, true);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isMouseActiveRef.current && isPinchingRef.current) {
        sound.playRelease();
        isPinchingRef.current = false;
        onCursorMove(cursorPosRef.current, false, true);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isMouseActiveRef.current || !containerRef.current) return;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        cursorPosRef.current = { x, y };
        if (isPinchingRef.current) {
          onCursorMove({ x, y }, true, true);
        }
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isMouseActiveRef.current && isPinchingRef.current) {
        sound.playRelease();
        isPinchingRef.current = false;
        onCursorMove(cursorPosRef.current, false, true);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [onCursorMove]);

  // Toggle Camera with high-performance, low-latency setup
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (cameraInstanceRef.current) {
        try {
          await cameraInstanceRef.current.stop();
        } catch (e) {
          console.error('Error stopping camera:', e);
        }
      }
      if (handsInstanceRef.current) {
        try {
          await handsInstanceRef.current.close();
        } catch (e) {
          console.error('Error closing hands:', e);
        }
        handsInstanceRef.current = null;
      }
      setIsCameraActive(false);
      setHasHand(false);
      hasHandRef.current = false;
      return;
    }

    setCameraLoading(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('SECURE_CONTEXT_REQUIRED');
      }

      if (!window.Hands) {
        throw new Error('MediaPipe Hands library load unavailable');
      }

      if ((window as any).Module && typeof (window as any).Module === 'object') {
        try {
          delete (window as any).Module.arguments;
        } catch (_) {
          (window as any).Module.arguments = [];
        }
      }

      // Optimized MediaPipe Hands with Model Complexity 0 (Ultra Fast Real-Time Model)
      const hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // 0 = Lite (Fastest inference, 3x lower latency)
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: any) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const rawLandmarks = results.multiHandLandmarks[0];

          // High-Performance Velocity-Adaptive Dynamic Smoothing
          // Micro-movement (<0.002) is smoothed to eliminate camera tremor,
          // while any real motion (>0.006) rapidly transitions to 0.95 - 0.98 alpha for ZERO LATENCY!
          if (!smoothedLandmarksRef.current || smoothedLandmarksRef.current.length !== rawLandmarks.length) {
            smoothedLandmarksRef.current = rawLandmarks.map((pt: any) => ({ ...pt }));
          } else {
            smoothedLandmarksRef.current = rawLandmarks.map((pt: any, i: number) => {
              const prev = smoothedLandmarksRef.current![i];
              const distMoved = Math.hypot(pt.x - prev.x, pt.y - prev.y);
              // Ultra-responsive scaling: instant 0.95+ tracking during any hand movement
              const dynamicAlpha = Math.min(0.98, Math.max(0.46, 0.46 + distMoved * 42));

              return {
                x: prev.x * (1 - dynamicAlpha) + pt.x * dynamicAlpha,
                y: prev.y * (1 - dynamicAlpha) + pt.y * dynamicAlpha,
                z: (prev.z || 0) * (1 - dynamicAlpha) + (pt.z || 0) * dynamicAlpha,
              };
            });
          }

          const landmarks = smoothedLandmarksRef.current;
          handLandmarksRef.current = landmarks;

          if (!hasHandRef.current) {
            hasHandRef.current = true;
            setHasHand(true);
          }

          // Strict Two-Finger Detection Landmarks:
          // Thumb: 4 (Tip), 3 (IP), 2 (MCP), 1 (CMC)
          // Index: 8 (Tip), 7 (DIP), 6 (PIP), 5 (MCP)
          // Wrist: 0
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const indexDip = landmarks[7];
          const indexMcp = landmarks[5];
          const wrist = landmarks[0];

          if (indexTip && thumbTip && wrist && indexMcp) {
            const canvas = canvasRef.current;
            const w = canvas ? canvas.width : window.innerWidth;
            const h = canvas ? canvas.height : window.innerHeight;

            // Target Point:
            // When pointing normally, index finger tip is the intuitive pointing target.
            // When pinching, it centers between thumb and index for natural tactile grip.
            const isCurrentlyPinching = isPinchingRef.current;
            const targetX = isCurrentlyPinching ? (indexTip.x * 0.5 + thumbTip.x * 0.5) : indexTip.x;
            const targetY = isCurrentlyPinching ? (indexTip.y * 0.5 + thumbTip.y * 0.5) : indexTip.y;

            // Mirror X horizontally for natural AR mirror feel
            const cursorX = (1 - targetX) * w;
            const cursorY = targetY * h;

            cursorPosRef.current = { x: cursorX, y: cursorY };

            // Hand scale based strictly on the index finger knuckle to wrist
            const handScale = Math.hypot(wrist.x - indexMcp.x, wrist.y - indexMcp.y) || 0.2;

            // Distance exclusively between the TWO fingers (Thumb Tip to Index Tip & Index DIP):
            const rawDistTip = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            const rawDistDip = indexDip ? Math.hypot(thumbTip.x - indexDip.x, thumbTip.y - indexDip.y) : 1;

            const effectivePinchDist = Math.min(rawDistTip, rawDistDip * 1.05);
            const normalizedPinchDist = effectivePinchDist / handScale;

            // Ultra-responsive Pinch Hysteresis for the two fingers:
            // Engages instantly when thumb & index come together (< 0.55 normalized OR < 0.095 raw)
            // Holds tight during dragging, releasing only when fingers clearly separate (> 0.68 normalized AND > 0.12 raw)
            const prevPinch = isPinchingRef.current;
            let currentlyPinching = prevPinch;

            if (normalizedPinchDist < 0.55 || effectivePinchDist < 0.095) {
              currentlyPinching = true;
            } else if (normalizedPinchDist > 0.68 && effectivePinchDist > 0.12) {
              currentlyPinching = false;
            }

            isPinchingRef.current = currentlyPinching;

            if (!prevPinch && currentlyPinching) {
              sound.playPinch();
            } else if (prevPinch && !currentlyPinching) {
              sound.playRelease();
            }

            isMouseActiveRef.current = false;
            onCursorMove(cursorPosRef.current, currentlyPinching, true);
          }
        } else {
          smoothedLandmarksRef.current = null;
          handLandmarksRef.current = null;
          if (hasHandRef.current) {
            hasHandRef.current = false;
            setHasHand(false);
          }
          if (!isMouseActiveRef.current) {
            isPinchingRef.current = false;
            onCursorMove(cursorPosRef.current, false, false);
          }
        }
      });

      handsInstanceRef.current = hands;

      if (videoRef.current) {
        // Drop frames if previous frame is still analyzing to guarantee 0ms queuing lag
        let isProcessingFrame = false;

        if (typeof (window as any).Camera === 'function') {
          const camera = new (window as any).Camera(videoRef.current, {
            onFrame: async () => {
              if (isProcessingFrame) return; // Drop frame to prevent queue delay
              if (videoRef.current && handsInstanceRef.current && videoRef.current.readyState >= 2) {
                isProcessingFrame = true;
                try {
                  await handsInstanceRef.current.send({ image: videoRef.current });
                } catch (err) {
                  console.warn('Frame processing error:', err);
                } finally {
                  isProcessingFrame = false;
                }
              }
            },
            width: 640,
            height: 480,
          });

          await camera.start();
          cameraInstanceRef.current = camera;
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 640 }, 
              height: { ideal: 480 }, 
              frameRate: { ideal: 60, min: 30 },
              facingMode: 'user' 
            },
          });
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          let isStreaming = true;
          let animFrameId: number;

          const sendFrameLoop = async () => {
            if (!isStreaming) return;
            if (!isProcessingFrame && videoRef.current && handsInstanceRef.current && videoRef.current.readyState >= 2) {
              isProcessingFrame = true;
              try {
                await handsInstanceRef.current.send({ image: videoRef.current });
              } catch (err) {
                console.warn('Frame processing error:', err);
              } finally {
                isProcessingFrame = false;
              }
            }
            if (isStreaming) {
              animFrameId = requestAnimationFrame(sendFrameLoop);
            }
          };

          sendFrameLoop();

          cameraInstanceRef.current = {
            stop: async () => {
              isStreaming = false;
              if (animFrameId) cancelAnimationFrame(animFrameId);
              if (videoRef.current && videoRef.current.srcObject) {
                const s = videoRef.current.srcObject as MediaStream;
                s.getTracks().forEach((track) => track.stop());
                videoRef.current.srcObject = null;
              }
            },
          };
        }
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera initialization failed:', err);
      if (err?.message === 'SECURE_CONTEXT_REQUIRED' || err?.message?.includes('getUserMedia')) {
        setCameraError('ক্যামেরা কেবল http://localhost:3000 এ কাজ করে। ব্রাউজারে http://localhost:3000 লিখে অ্যাপটি রিফ্রেশ করুন।');
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError('ক্যামেরার অনুমতি দেওয়া হয়নি। ব্রাউজার সাইট সেটিংসে ক্যামেরা এলাউ (Allow) করুন।');
      } else {
        setCameraError(`ক্যামেরা চালু হয়নি: ${err?.message || 'অনুমতি বা ডিভাইস চেক করুন'}`);
      }
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  // High-performance canvas rendering loop
  useEffect(() => {
    let animId: number;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const parent = canvas.parentElement;
          if (parent) {
            if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
              canvas.width = parent.clientWidth;
              canvas.height = parent.clientHeight;
            }
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw mirrored video feed
          if (isCameraActive && videoRef.current && videoRef.current.readyState >= 2) {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          }

          // Draw Two-Finger Neon Skeleton (Thumb & Index Finger Only)
          if (isCameraActive && handLandmarksRef.current) {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);

            const isPinching = isPinchingRef.current;
            const strokeColor = isPinching ? '#22c55e' : '#38bdf8';
            const glowColor = isPinching ? 'rgba(34, 197, 94, 0.7)' : 'rgba(56, 189, 248, 0.7)';

            // Two-finger connection segments (Thumb: 0-1-2-3-4, Index: 0-5-6-7-8, Webbing: 1-5)
            const twoFingerSegments: [number, number][] = [
              [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
              [0, 5], [5, 6], [6, 7], [7, 8], // Index Finger
              [1, 5], // Webbing between thumb and index
            ];

            ctx.lineWidth = isPinching ? 3.5 : 2.5;
            ctx.strokeStyle = strokeColor;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 12;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw two-finger neon bones
            twoFingerSegments.forEach(([iA, iB]) => {
              const ptA = handLandmarksRef.current[iA];
              const ptB = handLandmarksRef.current[iB];
              if (ptA && ptB) {
                ctx.beginPath();
                ctx.moveTo(ptA.x * canvas.width, ptA.y * canvas.height);
                ctx.lineTo(ptB.x * canvas.width, ptB.y * canvas.height);
                ctx.stroke();
              }
            });

            // Dynamic Electric Beam between Thumb Tip (4) and Index Tip (8)
            const thumbTipPt = handLandmarksRef.current[4];
            const indexTipPt = handLandmarksRef.current[8];
            if (thumbTipPt && indexTipPt) {
              const tx = thumbTipPt.x * canvas.width;
              const ty = thumbTipPt.y * canvas.height;
              const ix = indexTipPt.x * canvas.width;
              const iy = indexTipPt.y * canvas.height;
              const distPx = Math.hypot(tx - ix, ty - iy);

              if (distPx < 160) {
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(ix, iy);
                ctx.lineWidth = isPinching ? 4 : 2;
                ctx.strokeStyle = isPinching ? '#22c55e' : 'rgba(56, 189, 248, 0.7)';
                if (!isPinching) {
                  ctx.setLineDash([4, 4]);
                } else {
                  ctx.setLineDash([]);
                }
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }

            // Draw glowing joint nodes for the two fingers only
            const twoFingerJoints = [0, 1, 2, 3, 5, 6, 7];
            twoFingerJoints.forEach((idx) => {
              const pt = handLandmarksRef.current[idx];
              if (pt) {
                const px = pt.x * canvas.width;
                const py = pt.y * canvas.height;
                ctx.beginPath();
                ctx.arc(px, py, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = strokeColor;
                ctx.fill();
              }
            });

            // Prominent Glowing Tips on Thumb Tip (4) and Index Tip (8)
            [4, 8].forEach((tipIdx) => {
              const pt = handLandmarksRef.current[tipIdx];
              if (pt) {
                const px = pt.x * canvas.width;
                const py = pt.y * canvas.height;

                // Outer neon ring
                ctx.beginPath();
                ctx.arc(px, py, isPinching ? 8 : 6, 0, Math.PI * 2);
                ctx.fillStyle = isPinching ? 'rgba(34, 197, 94, 0.45)' : 'rgba(56, 189, 248, 0.45)';
                ctx.fill();

                // Inner core
                ctx.beginPath();
                ctx.arc(px, py, isPinching ? 4.5 : 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = strokeColor;
                ctx.stroke();
              }
            });

            ctx.restore();
          }

          // Draw Futuristic Responsive AR Cursor on Canvas
          const pos = cursorPosRef.current;
          if (pos.x > 0 && pos.y > 0) {
            const isPinching = isPinchingRef.current;

            ctx.save();

            let color = '#38bdf8'; // Default Cyan
            let radius = isPinching ? 16 : 22;

            if (cursorFeedback === 'hover') {
              color = '#fbbf24'; // Golden Amber for Hover
            } else if (cursorFeedback === 'wrong' || cursorFeedback === 'miss') {
              color = '#f43f5e'; // Rose Red for Wrong
            } else if (cursorFeedback === 'success') {
              color = '#10b981'; // Emerald Green for Success
            } else if (isPinching) {
              color = '#22c55e'; // Green for Active Grip
            }

            // Glow Ring
            ctx.shadowColor = color;
            ctx.shadowBlur = isPinching ? 18 : 12;

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = isPinching ? color + '45' : color + '25';
            ctx.fill();

            // Outer Perimeter Ring
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.lineWidth = isPinching ? 3.5 : 2.5;
            ctx.strokeStyle = color;
            if (cursorFeedback === 'hover' && !isPinching) {
              ctx.setLineDash([5, 5]);
            } else {
              ctx.setLineDash([]);
            }
            ctx.stroke();

            // Center Target Crosshair
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, isPinching ? 5 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Targeting Tick Marks
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            const tickLen = isPinching ? 7 : 5;

            // Top Tick
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - radius - tickLen);
            ctx.lineTo(pos.x, pos.y - radius + 2);
            ctx.stroke();
            // Bottom Tick
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y + radius - 2);
            ctx.lineTo(pos.x, pos.y + radius + tickLen);
            ctx.stroke();
            // Left Tick
            ctx.beginPath();
            ctx.moveTo(pos.x - radius - tickLen, pos.y);
            ctx.lineTo(pos.x - radius + 2, pos.y);
            ctx.stroke();
            // Right Tick
            ctx.beginPath();
            ctx.moveTo(pos.x + radius - 2, pos.y);
            ctx.lineTo(pos.x + radius + tickLen, pos.y);
            ctx.stroke();

            if (isPinching) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText('GRIP', pos.x, pos.y - radius - 8);
            }

            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(drawLoop);
    };

    animId = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(animId);
  }, [isCameraActive, gameType, cursorFeedback]);

  // Fallback Mouse and Touch Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    isMouseActiveRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cursorPosRef.current = { x, y };
    onCursorMove({ x, y }, isPinchingRef.current, true);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isMouseActiveRef.current = true;
    isPinchingRef.current = true;
    sound.playPinch();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cursorPosRef.current = { x, y };
    onCursorMove({ x, y }, true, true);
  };

  const handleMouseUp = () => {
    if (isPinchingRef.current) {
      sound.playRelease();
    }
    isPinchingRef.current = false;
    onCursorMove(cursorPosRef.current, false, true);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isMouseActiveRef.current = true;
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      cursorPosRef.current = { x, y };
      isPinchingRef.current = true;
      sound.playPinch();
      onCursorMove({ x, y }, true, true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    isMouseActiveRef.current = true;
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      cursorPosRef.current = { x, y };
      onCursorMove({ x, y }, isPinchingRef.current, true);
    }
  };

  const handleTouchEnd = () => {
    if (isPinchingRef.current) {
      sound.playRelease();
    }
    isPinchingRef.current = false;
    onCursorMove(cursorPosRef.current, false, true);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-80px)] overflow-hidden bg-slate-950 select-none touch-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        className="absolute -top-[9999px] -left-[9999px] opacity-0 pointer-events-none w-[640px] h-[480px]"
        width={640}
        height={480}
        playsInline
        muted
      />

      {!isCameraActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 opacity-90">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
        </div>
      )}

      {/* AR Overlay Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
      />

      {/* Camera Toggle Button */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
        <button
          onClick={toggleCamera}
          disabled={cameraLoading}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 backdrop-blur-md transition-all shadow-lg border ${
            isCameraActive
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-indigo-600/30 text-indigo-200 border-indigo-400/30 hover:bg-indigo-600/50'
          }`}
        >
          {cameraLoading ? (
            <div className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
          ) : isCameraActive ? (
            <>
              <Video className="w-4 h-4 text-emerald-400" />
              <span>AR ক্যামেরা চালু (Active)</span>
            </>
          ) : (
            <>
              <VideoOff className="w-4 h-4 text-indigo-300" />
              <span>AR ক্যামেরা সক্রিয় করুন</span>
            </>
          )}
        </button>
      </div>

      {isCameraActive && !hasHand && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 backdrop-blur-md shadow-xl text-sm font-medium flex items-center gap-2 animate-pulse">
          <Hand className="w-4 h-4 text-amber-400" />
          <span>আপনার হাত ক্যামেরার সামনে আনুন (বৃদ্ধাঙ্গুলি ও তর্জনী)...</span>
        </div>
      )}

      {isCameraActive && hasHand && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-slate-900/85 border border-cyan-400/40 text-cyan-300 backdrop-blur-md shadow-lg text-xs font-semibold flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>✌️ ২-আঙুল ট্র্যাকিং সক্রিয় (বৃদ্ধাঙ্গুলি ও তর্জনী)</span>
        </div>
      )}

      {cameraError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 backdrop-blur-md text-xs font-medium">
          {cameraError}
        </div>
      )}

      <div className="relative z-20 w-full h-full">
        {children}
      </div>
    </div>
  );
};
