import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Scissors, 
  Sparkles
} from 'lucide-react';
import { Button } from '../common/Button';

interface InteractiveVideoTrimmerProps {
  mediaUrl?: string | null;
  assetDuration: number;
  initialStartSeconds?: number | null;
  initialEndSeconds?: number | null;
  sceneNumber: number;
  onRangeChange: (sceneNumber: number, start: number, end: number) => void;
  isReadOnly?: boolean;
}

/**
 * Formatea segundos a MM:SS.s (ej. 00:08.2)
 */
export function formatTimeSec(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mStr = mins.toString().padStart(2, '0');
  const sStr = secs.toFixed(1).padStart(4, '0');
  return `${mStr}:${sStr}`;
}

export function InteractiveVideoTrimmer({
  mediaUrl,
  assetDuration,
  initialStartSeconds,
  initialEndSeconds,
  sceneNumber,
  onRangeChange,
  isReadOnly = false,
}: InteractiveVideoTrimmerProps) {
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const totalDuration = Math.max(1, detectedDuration || assetDuration || 30);

  const initialStart = typeof initialStartSeconds === 'number' && initialStartSeconds >= 0
    ? initialStartSeconds
    : 0;

  const initialEnd = typeof initialEndSeconds === 'number' && initialEndSeconds > initialStart
    ? Math.min(totalDuration, initialEndSeconds)
    : totalDuration;

  const [startSec, setStartSec] = useState<number>(initialStart);
  const [endSec, setEndSec] = useState<number>(initialEnd);
  const [currentTime, setCurrentTime] = useState<number>(initialStart);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isClipPlaying, setIsClipPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<'start' | 'end' | 'playhead' | null>(null);

  // Sincronizar props externas si cambian desde fuera
  useEffect(() => {
    setStartSec(initialStart);
    setEndSec(initialEnd);
  }, [initialStart, initialEnd]);

  // Persistir cambios hacia el parent/Supabase
  const commitRangeChange = useCallback((newStart: number, newEnd: number) => {
    const s = Math.max(0, parseFloat(newStart.toFixed(1)));
    const e = Math.min(totalDuration, parseFloat(newEnd.toFixed(1)));
    if (e > s && onRangeChange) {
      onRangeChange(sceneNumber, s, e);
    }
  }, [totalDuration, sceneNumber, onRangeChange]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration && !isNaN(video.duration) && video.duration > 0) {
      const realDur = parseFloat(video.duration.toFixed(1));
      setDetectedDuration(realDur);
      // Si endSec quedó en 5s pero el video real dura mucho más (ej. 47s), expandir endSec
      if (endSec <= 5 && realDur > 5 && (initialEndSeconds === null || initialEndSeconds === undefined || initialEndSeconds === 5)) {
        setEndSec(realDur);
        commitRangeChange(startSec, realDur);
      }
    }
  };

  // Manejo de Reproducción con audio sincronizado
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setIsClipPlaying(false);
    } else {
      // Si el cursor está fuera del rango o al final, resetear a startSec
      if (video.currentTime >= endSec || video.currentTime < startSec) {
        video.currentTime = startSec;
      }
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const playFragmentOnly = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = startSec;
    video.play().catch(() => {});
    setIsPlaying(true);
    setIsClipPlaying(true);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);

    // Si está en modo reproducción de fragmento y llega al final
    if (isClipPlaying && video.currentTime >= endSec - 0.05) {
      video.pause();
      video.currentTime = startSec;
      setIsPlaying(false);
      setIsClipPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Drag en la Timeline
  const getTimeFromMouseEvent = useCallback((e: React.MouseEvent | MouseEvent | TouchEvent): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const clientX = 'touches' in e && e.touches.length > 0 
      ? e.touches[0].clientX 
      : (e as MouseEvent).clientX;
    
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = offsetX / rect.width;
    return parseFloat((ratio * totalDuration).toFixed(1));
  }, [totalDuration]);

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    const clickedTime = getTimeFromMouseEvent(e);
    setCurrentTime(clickedTime);
    if (videoRef.current) {
      videoRef.current.currentTime = clickedTime;
    }
  };

  const handleStartDrag = (type: 'start' | 'end' | 'playhead', e: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    isDraggingRef.current = type;

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const t = getTimeFromMouseEvent(moveEvent);

      if (isDraggingRef.current === 'start') {
        const clampedStart = Math.max(0, Math.min(endSec - 0.5, t));
        setStartSec(clampedStart);
        if (videoRef.current) videoRef.current.currentTime = clampedStart;
        setCurrentTime(clampedStart);
      } else if (isDraggingRef.current === 'end') {
        const clampedEnd = Math.min(totalDuration, Math.max(startSec + 0.5, t));
        setEndSec(clampedEnd);
        if (videoRef.current) videoRef.current.currentTime = clampedEnd;
        setCurrentTime(clampedEnd);
      } else if (isDraggingRef.current === 'playhead') {
        setCurrentTime(t);
        if (videoRef.current) videoRef.current.currentTime = t;
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        if (isDraggingRef.current === 'start' || isDraggingRef.current === 'end') {
          // Commit to parent/Supabase on drag release
          setStartSec((currStart) => {
            setEndSec((currEnd) => {
              commitRangeChange(currStart, currEnd);
              return currEnd;
            });
            return currStart;
          });
        }
      }
      isDraggingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
  };

  // Ajustes de Precisión (±0.1s / ±1s)
  const adjustStart = (delta: number) => {
    const newStart = Math.max(0, Math.min(endSec - 0.5, parseFloat((startSec + delta).toFixed(1))));
    setStartSec(newStart);
    if (videoRef.current) videoRef.current.currentTime = newStart;
    setCurrentTime(newStart);
    commitRangeChange(newStart, endSec);
  };

  const adjustEnd = (delta: number) => {
    const newEnd = Math.min(totalDuration, Math.max(startSec + 0.5, parseFloat((endSec + delta).toFixed(1))));
    setEndSec(newEnd);
    if (videoRef.current) videoRef.current.currentTime = newEnd;
    setCurrentTime(newEnd);
    commitRangeChange(startSec, newEnd);
  };

  // Porcentajes para renderizado de CSS
  const startPercent = Math.max(0, Math.min(100, (startSec / totalDuration) * 100));
  const endPercent = Math.max(0, Math.min(100, (endSec / totalDuration) * 100));
  const playheadPercent = Math.max(0, Math.min(100, (currentTime / totalDuration) * 100));
  const rangeDuration = Math.max(0.1, parseFloat((endSec - startSec).toFixed(1)));

  return (
    <div className="p-3.5 bg-dark-950/90 rounded-2xl border border-dark-800 space-y-3 shadow-xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-aura-400">
          <Scissors className="w-3.5 h-3.5" />
          <span>Editor de Fragmento & Audio</span>
        </div>

        {/* Current Time Display */}
        <div className="flex items-center gap-2 font-mono text-[11px] bg-dark-900 px-2 py-0.5 rounded-lg border border-dark-800">
          <span className="text-white font-bold">{formatTimeSec(currentTime)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">{formatTimeSec(totalDuration)}</span>
        </div>
      </div>

      {/* Synchronized Video Monitor with Audio */}
      {mediaUrl && (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-dark-800 shadow-inner flex items-center justify-center group">
          <video
            ref={videoRef}
            src={mediaUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              setIsPlaying(false);
              setIsClipPlaying(false);
            }}
            playsInline
            className="w-full h-full object-contain"
          />

          {/* Quick Play Overlay Button */}
          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-aura-600/90 text-white flex items-center justify-center transition-all backdrop-blur-sm shadow-2xl border border-white/20 hover:scale-110 active:scale-95"
            >
              <Play className="w-5 h-5 ml-0.5 text-white" />
            </button>
          )}

          {/* Live Monitor Badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-white border border-white/10 font-bold">
              {formatTimeSec(currentTime)}
            </span>
            {isClipPlaying && (
              <span className="px-2 py-0.5 rounded-md bg-aura-600/90 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider animate-pulse">
                Clip Activo ({rangeDuration}s)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interactive Timeline Track */}
      <div className="space-y-1.5">
        <div
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
          className="relative h-9 bg-dark-900 rounded-xl border border-dark-800 cursor-pointer select-none overflow-hidden group"
        >
          {/* Background Ruler Grid */}
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-15 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-0.5 h-4 bg-slate-400 rounded-full" />
            ))}
          </div>

          {/* Active Highlight Range Area */}
          <div
            className="absolute top-0 bottom-0 bg-aura-500/30 border-y-2 border-aura-400 backdrop-blur-[1px] transition-[left,width] duration-75"
            style={{
              left: `${startPercent}%`,
              width: `${endPercent - startPercent}%`,
            }}
          />

          {/* Start Handle [START] */}
          <div
            onMouseDown={(e) => handleStartDrag('start', e)}
            onTouchStart={(e) => handleStartDrag('start', e)}
            title={`Inicio: ${formatTimeSec(startSec)} (Arrastrá para ajustar)`}
            className="absolute top-0 bottom-0 w-3.5 -ml-[7px] bg-aura-500 hover:bg-aura-400 cursor-ew-resize flex items-center justify-center rounded shadow-lg z-20 hover:scale-110 transition-transform"
            style={{ left: `${startPercent}%` }}
          >
            <div className="w-0.5 h-4 bg-white rounded-full" />
          </div>

          {/* End Handle [END] */}
          <div
            onMouseDown={(e) => handleStartDrag('end', e)}
            onTouchStart={(e) => handleStartDrag('end', e)}
            title={`Fin: ${formatTimeSec(endSec)} (Arrastrá para ajustar)`}
            className="absolute top-0 bottom-0 w-3.5 -ml-[7px] bg-aura-500 hover:bg-aura-400 cursor-ew-resize flex items-center justify-center rounded shadow-lg z-20 hover:scale-110 transition-transform"
            style={{ left: `${endPercent}%` }}
          >
            <div className="w-0.5 h-4 bg-white rounded-full" />
          </div>

          {/* Playhead Needle Indicator */}
          <div
            onMouseDown={(e) => handleStartDrag('playhead', e)}
            onTouchStart={(e) => handleStartDrag('playhead', e)}
            className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-amber-400 shadow-md shadow-amber-500/50 z-30 pointer-events-none"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="w-2.5 h-2.5 bg-amber-400 rounded-full -ml-[3px] -mt-1 shadow" />
          </div>
        </div>

        {/* Timeline Range Time Indicators */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-0.5">
          <span>00:00.0</span>
          <span className="text-aura-300 font-bold bg-dark-900/90 px-2 py-0.5 rounded border border-dark-800">
            {formatTimeSec(startSec)} → {formatTimeSec(endSec)}
          </span>
          <span>{formatTimeSec(totalDuration)}</span>
        </div>
      </div>

      {/* Playback & Audio Controls Bar */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-dark-800/80">
        <div className="flex items-center gap-1.5">
          {/* Play / Pause with Audio */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlay}
            leftIcon={isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            className="text-[11px] h-7 px-2.5 bg-dark-900 border-dark-700 hover:border-aura-500/50 text-slate-200"
          >
            {isPlaying ? 'Pausar' : 'Reproducir'}
          </Button>

          {/* Play Fragment Only */}
          <Button
            variant="ghost"
            size="sm"
            onClick={playFragmentOnly}
            leftIcon={<Sparkles className="w-3 h-3 text-aura-400" />}
            className="text-[11px] h-7 px-2 text-aura-300 hover:bg-aura-950/40 border border-aura-500/20"
            title="Reproduce exactamente desde el inicio hasta el final del fragmento"
          >
            Fragmento ({rangeDuration}s)
          </Button>

          {/* Mute / Unmute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMuted 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                : 'bg-dark-900 text-slate-300 border-dark-800 hover:text-white'
            }`}
            title={isMuted ? 'Activar sonido original' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Resulting Scene Duration Badge */}
        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-300 bg-dark-900 px-2 py-1 rounded-lg border border-dark-800">
          <span className="text-[10px] text-slate-500 font-sans font-normal">Uso:</span>
          <span className="text-aura-400 font-bold">{rangeDuration}s</span>
        </div>
      </div>

      {/* Fine-Tuning Precision Controls Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {/* Start Point Fine-Tuning */}
        <div className="p-2 bg-dark-900/90 rounded-xl border border-dark-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-semibold">Inicio Fragmento</span>
            <span className="text-white font-mono font-bold">{formatTimeSec(startSec)}</span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              disabled={isReadOnly || startSec <= 0}
              onClick={() => adjustStart(-1)}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-dark-950 hover:bg-dark-800 text-slate-300 rounded border border-dark-800 disabled:opacity-30"
              title="Restar 1 segundo"
            >
              -1s
            </button>
            <button
              type="button"
              disabled={isReadOnly || startSec <= 0}
              onClick={() => adjustStart(-0.1)}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-dark-950 hover:bg-dark-800 text-slate-300 rounded border border-dark-800 disabled:opacity-30"
              title="Restar 0.1s"
            >
              -0.1s
            </button>
            <button
              type="button"
              disabled={isReadOnly || startSec >= endSec - 0.5}
              onClick={() => adjustStart(0.1)}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-dark-950 hover:bg-dark-800 text-slate-300 rounded border border-dark-800 disabled:opacity-30"
              title="Sumar 0.1s"
            >
              +0.1s
            </button>
            <button
              type="button"
              disabled={isReadOnly || startSec >= endSec - 1}
              onClick={() => adjustStart(1)}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-dark-950 hover:bg-dark-800 text-slate-300 rounded border border-dark-800 disabled:opacity-30"
              title="Sumar 1 segundo"
            >
              +1s
            </button>
          </div>
        </div>

        {/* End Point Fine-Tuning */}
        <div className="p-2 bg-dark-900/90 rounded-xl border border-dark-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-semibold">Fin Fragmento</span>
            <span className="text-white font-mono font-bold">{formatTimeSec(endSec)}</span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              disabled={isReadOnly || endSec <= startSec + 1}
              onClick={() => adjustEnd(-1)}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-dark-950 hover:bg-dark-800 text-slate-300 rounded border border-dark-800 disabled:opacity-30"
              title="Restar 1 segundo"
            >
              -1s
            </button>
            <button
              type="button"
              disabled={isReadOnly || endSec <= startSec + 0.5}
              onClick={() => adjustEnd(-0.1)}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-dark-950 hover:bg-dark-800 text-slate-300 rounded border border-dark-800 disabled:opacity-30"
              title="Restar 0.1s"
            >
              -0.1s
            </button>
            <button
              type="button"
              disabled={isReadOnly || endSec >= totalDuration}
              onClick={() => adjustEnd(0.1)}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-dark-950 hover:bg-dark-800 text-slate-300 rounded border border-dark-800 disabled:opacity-30"
              title="Sumar 0.1s"
            >
              +0.1s
            </button>
            <button
              type="button"
              disabled={isReadOnly || endSec >= totalDuration}
              onClick={() => adjustEnd(1)}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-dark-950 hover:bg-dark-800 text-slate-300 rounded border border-dark-800 disabled:opacity-30"
              title="Sumar 1 segundo"
            >
              +1s
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
