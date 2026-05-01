/**
 * ArtifactRenderer Component
 * Renders screenshots and recordings with thumbnails and actions
 * For chat messages and activity feed integration
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Video, 
  Download, 
  Trash2, 
  Eye, 
  X, 
  Play, 
  Pause,
  Share2,
  Clock,
  Monitor,
  FileImage,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { ArtifactMetadata, ArtifactEvent } from '../utils/artifactTypes';

interface ArtifactRendererProps {
  artifact: ArtifactMetadata;
  showActions?: boolean;
  compact?: boolean;
  onDelete?: (id: string) => void;
  onDownload?: (artifact: ArtifactMetadata) => void;
  onShare?: (artifact: ArtifactMetadata) => void;
}

export function ArtifactRenderer({
  artifact,
  showActions = true,
  compact = false,
  onDelete,
  onDownload,
  onShare,
}: ArtifactRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isVideo = artifact.type === 'recording' || artifact.type === 'video';
  const isScreenshot = artifact.type === 'screenshot';

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={cn(
      'rounded-xl border border-white/10 bg-black/40 overflow-hidden',
      compact ? 'max-w-[300px]' : 'max-w-[500px]'
    )}>
      {/* Header with icon and title */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        {isScreenshot && <Camera className="h-4 w-4 text-violet-400" />}
        {isVideo && <Video className="h-4 w-4 text-cyan-400" />}
        <span className="text-[12px] font-medium text-zinc-200 truncate flex-1">
          {artifact.name}
        </span>
        <span className="text-[10px] text-zinc-500">
          {formatSize(artifact.size)}
        </span>
      </div>

      {/* Content */}
      {isScreenshot ? (
        <div className="relative">
          {compact ? (
            <img 
              src={artifact.url} 
              alt={artifact.name}
              className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setIsExpanded(true)}
            />
          ) : (
            <img 
              src={artifact.url} 
              alt={artifact.name}
              className="w-full max-h-[420px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setIsExpanded(true)}
            />
          )}
        </div>
      ) : isVideo ? (
        <div className="relative bg-black">
          <video 
            src={artifact.url}
            controls
            className="w-full max-h-[300px]"
            preload="metadata"
          />
        </div>
      ) : null}

      {/* Source context */}
      {artifact.sourceContext && (artifact.sourceContext.url || artifact.sourceContext.stepName) && (
        <div className="px-3 py-1.5 bg-zinc-900/50 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            {artifact.sourceContext.url && (
              <>
                <Monitor className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{new URL(artifact.sourceContext.url).hostname}</span>
              </>
            )}
            {artifact.sourceContext.stepName && (
              <>
                <span className="text-zinc-600">•</span>
                <span>{artifact.sourceContext.stepName}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/5">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition"
          >
            <Eye className="h-3 w-3" />
            {compact ? 'View' : 'Expand'}
          </button>
          {onDownload && (
            <button
              onClick={() => onDownload(artifact)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition"
            >
              <Download className="h-3 w-3" />
              Download
            </button>
          )}
          {onShare && (
            <button
              onClick={() => onShare(artifact)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition"
            >
              <Share2 className="h-3 w-3" />
              Share
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(artifact.id)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 transition ml-auto"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
        </div>
      )}

      {/* Expanded view modal */}
      {isExpanded && (
        <ArtifactModal 
          artifact={artifact} 
          onClose={() => setIsExpanded(false)}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

interface ArtifactModalProps {
  artifact: ArtifactMetadata;
  onClose: () => void;
  onDownload?: (artifact: ArtifactMetadata) => void;
  onDelete?: (id: string) => void;
}

function ArtifactModal({ artifact, onClose, onDownload, onDelete }: ArtifactModalProps) {
  const isVideo = artifact.type === 'recording' || artifact.type === 'video';
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] w-full mx-4 rounded-2xl border border-white/20 bg-zinc-950 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            {artifact.type === 'screenshot' && <Camera className="h-5 w-5 text-violet-400" />}
            {artifact.type === 'recording' && <Video className="h-5 w-5 text-cyan-400" />}
            <div>
              <div className="text-[14px] font-medium text-white">{artifact.name}</div>
              <div className="text-[11px] text-zinc-400">
                {artifact.timestamp ? new Date(artifact.timestamp).toLocaleString() : ''}
                {artifact.sourceContext?.url && ` • ${new URL(artifact.sourceContext.url).hostname}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={() => onDownload(artifact)}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[12px] text-white hover:bg-white/20 transition"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(artifact.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-[12px] text-red-300 hover:bg-red-500/30 transition"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
          {artifact.type === 'screenshot' && (
            <img 
              src={artifact.url} 
              alt={artifact.name}
              className="w-full h-auto rounded-lg"
            />
          )}
          {isVideo && (
            <video 
              src={artifact.url}
              controls
              autoPlay
              className="w-full rounded-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Artifact list for activity panel
interface ArtifactListProps {
  artifacts: ArtifactMetadata[];
  limit?: number;
  onArtifactClick?: (artifact: ArtifactMetadata) => void;
  onDelete?: (id: string) => void;
}

export function ArtifactList({ artifacts, limit, onArtifactClick, onDelete }: ArtifactListProps) {
  const displayArtifacts = limit ? artifacts.slice(0, limit) : artifacts;

  if (displayArtifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-zinc-800/50 ring-1 ring-white/10">
          <Camera className="h-5 w-5 text-zinc-500" />
        </div>
        <div className="text-[13px] font-medium text-zinc-300">No artifacts yet</div>
        <div className="mt-1 text-[11px] text-zinc-500">Screenshots and recordings will appear here</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayArtifacts.map((artifact) => (
        <ArtifactListItem
          key={artifact.id}
          artifact={artifact}
          onClick={() => onArtifactClick?.(artifact)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface ArtifactListItemProps {
  artifact: ArtifactMetadata;
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

function ArtifactListItem({ artifact, onClick, onDelete }: ArtifactListItemProps) {
  const isVideo = artifact.type === 'recording' || artifact.type === 'video';
  const [imgError, setImgError] = useState(false);

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className="flex items-center gap-3 rounded-lg border border-white/5 bg-zinc-900/40 p-2 hover:bg-zinc-900/60 cursor-pointer transition"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        {artifact.type === 'screenshot' && !imgError ? (
          <img 
            src={artifact.url} 
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {isVideo ? (
              <Video className="h-5 w-5 text-cyan-400" />
            ) : (
              <FileImage className="h-5 w-5 text-zinc-500" />
            )}
          </div>
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="h-4 w-4 text-white/80" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-zinc-200">
          {artifact.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-zinc-500">
            {formatTimestamp(artifact.timestamp)}
          </span>
          {artifact.sourceContext?.stepName && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="truncate text-[10px] text-zinc-500 max-w-[100px]">
                {artifact.sourceContext.stepName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Delete */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(artifact.id);
          }}
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Activity event item for realtime panel
interface ArtifactEventItemProps {
  event: ArtifactEvent;
  onClick?: (artifactId: string) => void;
}

export function ArtifactEventItem({ event, onClick }: ArtifactEventItemProps) {
  const getEventIcon = () => {
    switch (event.type) {
      case 'screenshot_start':
      case 'screenshot_complete':
        return <Camera className="h-4 w-4 text-violet-400" />;
      case 'recording_start':
      case 'recording_complete':
        return <Video className="h-4 w-4 text-cyan-400" />;
      case 'recording_error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'artifact_shared':
        return <Share2 className="h-4 w-4 text-emerald-400" />;
      default:
        return <FileImage className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getEventLabel = () => {
    switch (event.type) {
      case 'screenshot_start': return 'Screenshot started';
      case 'screenshot_complete': return 'Screenshot captured';
      case 'recording_start': return 'Recording started';
      case 'recording_complete': return 'Recording saved';
      case 'recording_error': return 'Recording failed';
      case 'artifact_shared': return 'Artifact shared';
      default: return 'Artifact event';
    }
  };

  const getEventColor = () => {
    switch (event.type) {
      case 'screenshot_complete':
      case 'recording_complete':
        return 'text-cyan-300';
      case 'recording_error':
        return 'text-red-300';
      case 'artifact_shared':
        return 'text-emerald-300';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div 
      className="flex items-center gap-3 rounded-lg border border-white/5 bg-zinc-900/40 p-2.5 hover:bg-zinc-900/60 cursor-pointer transition"
      onClick={() => event.artifactId && onClick?.(event.artifactId)}
    >
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-800 ring-1 ring-white/10">
        {getEventIcon()}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('text-[12px] font-medium', getEventColor())}>
          {getEventLabel()}
        </div>
        {event.sourceContext && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {event.sourceContext.url && (
              <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                {new URL(event.sourceContext.url).hostname}
              </span>
            )}
            {event.sourceContext.stepName && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-[10px] text-zinc-500 truncate">
                  {event.sourceContext.stepName}
                </span>
              </>
            )}
          </div>
        )}
        {event.error && (
          <div className="mt-1 flex items-start gap-1 rounded-md bg-red-500/10 p-1.5">
            <AlertCircle className="h-3 w-3 shrink-0 text-red-400 mt-0.5" />
            <div className="text-[10px] text-red-300">
              {event.error.message}
              {event.error.suggestion && (
                <div className="mt-0.5 text-red-400/70">{event.error.suggestion}</div>
              )}
            </div>
          </div>
        )}
      </div>
      <span className="text-[10px] text-zinc-500 shrink-0">
        {new Date(event.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}