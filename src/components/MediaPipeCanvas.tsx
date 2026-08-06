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
  
  // Ref states for requestAnimationFrame loop
  const cursorPosRef = useRef<Point2D>({ x: -100, y: -100 });
  const isPinchingRef = useRef<boolean>(false);
  const hasHandRef = useRef<boolean>(false);
  const handLandmarksRef = useRef<any>(null);
  const smoothedLandmarksRef = useRef<any[] | null>(null);
  const cameraInstanceRef = useRef<any>(null);
  const handsInstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMouseActiveRef = useRef<boolean>(true);

  // Global mouse / touch release handlers so drag-and-drop drops cleanly even if cursor leaves div
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

  // Toggle Camera
  const toggleCamera = async () => {
    if (isCameraActive) {
      // Stop Camera
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

      // Safely ensure Module.arguments does not throw without deleting loaded Module assets
      if ((window as any).Module && typeof (window as any).Module === 'object') {
        try {
          delete (window as any).Module.arguments;
        } catch (_) {
          (window as any).Module.arguments = [];
        }
      }

      const hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      hands.onResults((results: any) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const rawLandmarks = results.multiHandLandmarks[0];

          // Exponential Moving Average (EMA) smoothing to eliminate frame-to-frame jitter
          if (!smoothedLandmarksRef.current || smoothedLandmarksRef.current.length !== rawLandmarks.length) {
            smoothedLandmarksRef.current = rawLandmarks.map((pt: any) => ({ ...pt }));
          } else {
            // Smoothing factor alpha = 0.38 for smooth movement with zero perceptual lag
            const alpha = 0.38;
            smoothedLandmarksRef.current = rawLandmarks.map((pt: any, i: number) => {
              const prev = smoothedLandmarksRef.current![i];
              return {
                x: prev.x * (1 - alpha) + pt.x * alpha,
                y: prev.y * (1 - alpha) + pt.y * alpha,
                z: (prev.z || 0) * (1 - alpha) + (pt.z || 0) * alpha,
              };
            });
          }

          const landmarks = smoothedLandmarksRef.current;
          handLandmarksRef.current = landmarks;

          if (!hasHandRef.current) {
            hasHandRef.current = true;
            setHasHand(true);
          }

          // Landmark 8 is Index Tip, Landmark 4 is Thumb Tip, Landmark 0 is Wrist, Landmark 9 is Middle MCP
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const wrist = landmarks[0];
          const middleMcp = landmarks[9];

          if (indexTip && thumbTip && wrist && middleMcp) {
            const canvas = canvasRef.current;
            const w = canvas ? canvas.width : window.innerWidth;
            const h = canvas ? canvas.height : window.innerHeight;

            // Use midpoint between Thumb Tip and Index Tip for precise two-finger tracking
            const midX = (indexTip.x + thumbTip.x) / 2;
            const midY = (indexTip.y + thumbTip.y) / 2;

            // Mirror X because video feed is mirrored
            const cursorX = (1 - midX) * w;
            const cursorY = midY * h;

            cursorPosRef.current = { x: cursorX, y: cursorY };

            // Calculate hand scale (distance between Wrist and Middle MCP) for distance normalization
            const palmLength = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y) || 0.2;

            // Thumb-to-Index tip distance normalized by palm size
            const rawDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            const normalizedPinchDist = rawDist / palmLength;

            // Hysteresis pinch logic:
            // Pinch triggers when normalized distance < 0.35
            // Pinch releases when normalized distance > 0.45
            const prevPinch = isPinchingRef.current;
            let currentlyPinching = prevPinch;

            if (normalizedPinchDist < 0.35) {
              currentlyPinching = true;
            } else if (normalizedPinchDist > 0.45) {
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
        if (typeof (window as any).Camera === 'function') {
          const camera = new (window as any).Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsInstanceRef.current) {
                try {
                  await handsInstanceRef.current.send({ image: videoRef.current });
                } catch (err) {
                  console.warn('Frame processing error:', err);
                }
              }
            },
            width: 1280,
            height: 720,
          });

          await camera.start();
          cameraInstanceRef.current = camera;
        } else {
          // Native getUserMedia fallback
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          });
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          let isStreaming = true;
          let animFrameId: number;

          const sendFrameLoop = async () => {
            if (!isStreaming) return;
            if (videoRef.current && handsInstanceRef.current && videoRef.current.readyState >= 2) {
              try {
                await handsInstanceRef.current.send({ image: videoRef.current });
              } catch (err) {
                console.warn('Frame processing error:', err);
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

  // Separate animation loop for drawing video frame, hand connections, and cursor feedback
  useEffect(() => {
    let animId: number;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Sync size
          const parent = canvas.parentElement;
          if (parent) {
            if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
              canvas.width = parent.clientWidth;
              canvas.height = parent.clientHeight;
            }
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw video feed if camera is active
          if (isCameraActive && videoRef.current && videoRef.current.readyState >= 2) {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1); // Mirror video feed
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          }

          // Draw ONLY the 2 active interaction fingers (Thumb & Index)
          if (isCameraActive && handLandmarksRef.current) {
            const lm = handLandmarksRef.current;
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);

            const isPinching = isPinchingRef.current;

            // 1. Draw Thumb skeleton (Landmarks 1 -> 2 -> 3 -> 4)
            const thumbIndices = [1, 2, 3, 4];
            ctx.beginPath();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            thumbIndices.forEach((idx, i) => {
              if (lm[idx]) {
                const px = lm[idx].x * canvas.width;
                const py = lm[idx].y * canvas.height;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
            });
            ctx.stroke();

            // 2. Draw Index finger skeleton (Landmarks 5 -> 6 -> 7 -> 8)
            const indexIndices = [5, 6, 7, 8];
            ctx.beginPath();
            indexIndices.forEach((idx, i) => {
              if (lm[idx]) {
                const px = lm[idx].x * canvas.width;
                const py = lm[idx].y * canvas.height;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
            });
            ctx.stroke();

            // 3. Draw palm connector between Thumb base and Index base (1 -> 5)
            if (lm[1] && lm[5]) {
              ctx.beginPath();
              ctx.moveTo(lm[1].x * canvas.width, lm[1].y * canvas.height);
              ctx.lineTo(lm[5].x * canvas.width, lm[5].y * canvas.height);
              ctx.strokeStyle = '#0284c7';
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            // 4. Draw dynamic pinch bridge line between Thumb Tip (4) and Index Tip (8)
            const thumbTip = lm[4];
            const indexTip = lm[8];
            if (thumbTip && indexTip) {
              const tx = thumbTip.x * canvas.width;
              const ty = thumbTip.y * canvas.height;
              const ix = indexTip.x * canvas.width;
              const iy = indexTip.y * canvas.height;

              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(ix, iy);
              ctx.lineWidth = isPinching ? 5 : 2;
              ctx.strokeStyle = isPinching ? '#22c55e' : '#eab308';
              if (!isPinching) {
                ctx.setLineDash([4, 4]);
              } else {
                ctx.setLineDash([]);
              }
              ctx.stroke();
              ctx.setLineDash([]);

              // 5. Draw highlighted fingertip nodes for Thumb (4) and Index (8)
              [
                { pt: thumbTip, color: '#ec4899', label: 'বুড়ো আঙুল' },
                { pt: indexTip, color: '#3b82f6', label: 'তর্জনী' },
              ].forEach(({ pt, color }) => {
                const px = pt.x * canvas.width;
                const py = pt.y * canvas.height;

                // Outer glow
                ctx.beginPath();
                ctx.arc(px, py, isPinching ? 10 : 7, 0, Math.PI * 2);
                ctx.fillStyle = color + '60';
                ctx.fill();

                // Inner core
                ctx.beginPath();
                ctx.arc(px, py, isPinching ? 6 : 4, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
              });
            }

            ctx.restore();
          }

          // Draw Cursor Feedback on Canvas (High z-index)
          const pos = cursorPosRef.current;
          if (pos.x > 0 && pos.y > 0) {
            const isPinching = isPinchingRef.current;

            ctx.save();
            ctx.beginPath();

            // Set color based on gameType and cursorFeedback state
            let color = '#3b82f6'; // Normal Game 1: Blue
            let isDashed = false;
            let radius = isPinching ? 18 : 22;

            if (gameType === 'equation') {
              if (cursorFeedback === 'hover') {
                color = '#eab308'; // Yellow
                isDashed = true;
              } else if (cursorFeedback === 'miss') {
                color = '#ef4444'; // Red
              } else if (cursorFeedback === 'success') {
                color = '#22c55e'; // Green
              } else {
                color = '#3b82f6'; // Blue
              }
            } else {
              // Game 2 & 3: Normal Pink 🩷
              if (cursorFeedback === 'hover') {
                color = '#eab308'; // Yellow
              } else if (cursorFeedback === 'wrong' || cursorFeedback === 'miss') {
                color = '#ef4444'; // Red
              } else if (cursorFeedback === 'success') {
                color = '#22c55e'; // Green
              } else {
                color = '#ec4899'; // Pink
              }
            }

            // Draw outer pulse / glow ring
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;

            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = color + '40'; // Semi transparent fill
            ctx.fill();

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.lineWidth = 3;
            ctx.strokeStyle = color;

            if (isDashed) {
              ctx.setLineDash([6, 6]);
            } else {
              ctx.setLineDash([]);
            }
            ctx.stroke();

            // Center core dot
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Draw ✔️ check mark if success
            if (cursorFeedback === 'success') {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 16px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('✓', pos.x, pos.y);
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

  // Fallback Mouse and Touch Event Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    isMouseActiveRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cursorPosRef.current = { x, y };

    // Keep pinch state from mouse down
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

  // Touch handlers
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
      {/* Hidden Video Feed for MediaPipe */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />

      {/* Background Graphic Grid when camera is off */}
      {!isCameraActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 opacity-90">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
        </div>
      )}

      {/* AR Overlay Canvas (High z-index as strictly requested) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
      />

      {/* Top Controls Bar */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
        {/* Camera Toggle Button */}
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
              <span>AR ক্যামেরা চালু</span>
            </>
          ) : (
            <>
              <VideoOff className="w-4 h-4 text-indigo-300" />
              <span>AR ক্যামেরা সক্রিয় করুন</span>
            </>
          )}
        </button>
      </div>

      {/* Hand Detection Banner Alert */}
      {isCameraActive && !hasHand && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 backdrop-blur-md shadow-xl text-sm font-medium flex items-center gap-2 animate-pulse">
          <Hand className="w-4 h-4 text-amber-400" />
          <span>আপনার হাত শনাক্ত করা হচ্ছে...</span>
        </div>
      )}

      {/* Camera Error / Fallback Banner */}
      {cameraError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 backdrop-blur-md text-xs font-medium">
          {cameraError}
        </div>
      )}

      {/* Interactive UI Game Layer (z-20 below canvas cursor, above video background) */}
      <div className="relative z-20 w-full h-full">
        {children}
      </div>
    </div>
  );
};
