/**
 * ArtifactPanel Component
 * Panel for displaying and managing screenshot/recording artifacts
 * Integrated into the AgentsPanel's activity view
 */

import { useState, useEffect } from 'react';
import { 
  Camera, 
  Video, 
  Download, 
  Trash2, 
  RefreshCw,
  Settings,
  HardDrive,
  Clock,
  AlertCircle,
  Eye,
  Share2,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { ArtifactMetadata, ArtifactEvent, ArtifactStats } from '../utils/artifactTypes';
import { useArtifacts } from '../hooks/useArtifacts';
import { ArtifactList, ArtifactEventItem } from './ArtifactRenderer';

interface ArtifactPanelProps {
  isVisible?: boolean;
  initialMode?: 'artifacts' | 'events';
}

export function ArtifactPanel({ isVisible = true, initialMode = 'artifacts' }: ArtifactPanelProps) {
  const [mode, setMode] = useState<'artifacts' | 'events'>(initialMode);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactMetadata | null>(null);
  
  const {
    artifacts,
    isLoading,
    error,
    recordingStatus,
    recordingDuration,
    stats,
    takeScreenshot,
    startRecording,
    stopRecording,
    isRecording,
    refreshArtifacts,
    removeArtifact,
    clearAll,
    getStats,
    download,
    events,
  } = useArtifacts();

  if (!isVisible) return null;

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="border-t border-white/5">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/30 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-violet-400" />
          <span className="text-[12px] font-medium text-zinc-200">Artifacts</span>
          {stats && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300">
              {stats.screenshotsCount + stats.recordingsCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Recording controls */}
          {recordingStatus === 'recording' ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                <span className="text-[10px] font-medium text-red-300">
                  REC {formatDuration(recordingDuration)}
                </span>
              </div>
              <button
                onClick={() => stopRecording()}
                className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 transition"
              >
                Stop
              </button>
            </div>
          ) : recordingStatus === 'saving' ? (
            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Saving...
            </div>
          ) : (
            <button
              onClick={() => startRecording({ mode: 'on-demand' })}
              className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-500 transition"
            >
              <Video className="h-3 w-3" />
              Record
            </button>
          )}
          
          {/* View toggle */}
          <button
            onClick={refreshArtifacts}
            className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900/20 border-b border-white/5 text-[10px]">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Camera className="h-3 w-3" />
            <span>{stats.screenshotsCount} screenshots</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Video className="h-3 w-3" />
            <span>{stats.recordingsCount} recordings</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <HardDrive className="h-3 w-3" />
            <span>{formatSize(stats.totalSizeBytes)}</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-4 my-2 flex items-start gap-2 rounded-lg bg-red-500/10 p-2 border border-red-500/20">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div>
            <div className="text-[11px] font-medium text-red-300">{error.code}</div>
            <div className="text-[10px] text-red-400/80">{error.message}</div>
            {error.suggestion && (
              <div className="mt-1 text-[10px] text-zinc-400">{error.suggestion}</div>
            )}
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex border-b border-white/5 px-4 py-1">
        <button
          onClick={() => setMode('artifacts')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition',
            mode === 'artifacts'
              ? 'bg-violet-500/10 text-violet-300'
              : 'text-zinc-500 hover:bg-white/5'
          )}
        >
          <Camera className="h-3.5 w-3.5" />
          Artifacts
        </button>
        <button
          onClick={() => setMode('events')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition',
            mode === 'events'
              ? 'bg-violet-500/10 text-violet-300'
              : 'text-zinc-500 hover:bg-white/5'
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Events
          {events.length > 0 && (
            <span className="ml-1 rounded-full bg-cyan-500/30 px-1.5 py-0.5 text-[10px]">
              {events.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[300px] overflow-y-auto p-3">
        {mode === 'artifacts' ? (
          isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            <ArtifactList
              artifacts={artifacts}
              onArtifactClick={setSelectedArtifact}
              onDelete={removeArtifact}
            />
          )
        ) : (
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-8 w-8 text-zinc-500 mb-2" />
                <div className="text-[12px] text-zinc-400">No events yet</div>
                <div className="text-[10px] text-zinc-500 mt-1">Screenshot and recording events will appear here</div>
              </div>
            ) : (
              events.slice(0, 20).map((event, i) => (
                <ArtifactEventItem
                  key={`${event.artifactId}-${i}`}
                  event={event}
                  onClick={() => {
                    const artifact = artifacts.find(a => a.id === event.artifactId);
                    if (artifact) setSelectedArtifact(artifact);
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Actions footer */}
      {artifacts.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-zinc-900/30">
          <span className="text-[10px] text-zinc-500">
            {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={clearAll}
            className="text-[10px] text-red-400 hover:text-red-300 transition"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// Compact artifact badge for displaying artifact count in parent panel
interface ArtifactBadgeProps {
  screenshotsCount: number;
  recordingsCount: number;
  onClick?: () => void;
}

export function ArtifactBadge({ screenshotsCount, recordingsCount, onClick }: ArtifactBadgeProps) {
  const total = screenshotsCount + recordingsCount;
  if (total === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/30 transition"
    >
      <Camera className="h-3 w-3" />
      {total}
    </button>
  );
}