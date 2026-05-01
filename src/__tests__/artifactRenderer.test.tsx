/**
 * Tests for ArtifactRenderer and ArtifactPanel components
 * Covers chat/activity artifact rendering, thumbnails, and download actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { ArtifactRenderer, ArtifactList, ArtifactEventItem } from '../components/ArtifactRenderer';
import { ArtifactMetadata, ArtifactEvent } from '../utils/artifactTypes';

describe('ArtifactRenderer', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Screenshot Rendering', () => {
    it('should render screenshot artifact', () => {
      const screenshot: ArtifactMetadata = {
        id: 'scr_123',
        type: 'screenshot',
        name: 'Test Screenshot',
        filename: 'test.png',
        path: 'screenshots',
        url: 'blob:http://localhost/test.png',
        timestamp: Date.now(),
        size: 1024,
        mimeType: 'image/png',
      };

      render(<ArtifactRenderer artifact={screenshot} />);
      
      expect(screen.getByText('Test Screenshot')).toBeTruthy();
    });

    it('should render screenshot image', () => {
      const screenshot: ArtifactMetadata = {
        id: 'scr_123',
        type: 'screenshot',
        name: 'View screenshot',
        filename: 'test.png',
        path: 'screenshots',
        url: 'blob:http://localhost/test.png',
        timestamp: Date.now(),
        mimeType: 'image/png',
      };

      render(<ArtifactRenderer artifact={screenshot} />);
      
      const img = screen.getByRole('img');
      expect(img).toBeTruthy();
      expect(img.getAttribute('src')).toBe(screenshot.url);
    });

    it('should show compact mode', () => {
      const screenshot: ArtifactMetadata = {
        id: 'scr_123',
        type: 'screenshot',
        name: 'Compact screenshot',
        filename: 'test.png',
        path: 'screenshots',
        url: 'blob:http://localhost/test.png',
        timestamp: Date.now(),
        mimeType: 'image/png',
      };

      const { container } = render(<ArtifactRenderer artifact={screenshot} compact />);
      
      expect(container.querySelector('.max-w-\\[300px\\]')).toBeTruthy();
    });
  });

  describe('Recording Rendering', () => {
    it('should render recording artifact', () => {
      const recording: ArtifactMetadata = {
        id: 'rec_456',
        type: 'recording',
        name: 'Screen Recording',
        filename: 'recording.webm',
        path: 'recordings',
        url: 'blob:http://localhost/recording.webm',
        timestamp: Date.now(),
        size: 1024 * 1024,
        mimeType: 'video/webm',
      };

      const { container } = render(<ArtifactRenderer artifact={recording} />);
      
      expect(screen.getByText('Screen Recording')).toBeTruthy();
      const video = container.querySelector('video');
      expect(video).toBeTruthy();
    });

    it('should show video controls', () => {
      const recording: ArtifactMetadata = {
        id: 'rec_456',
        type: 'recording',
        name: 'Recording with controls',
        filename: 'recording.webm',
        path: 'recordings',
        url: 'blob:http://localhost/recording.webm',
        timestamp: Date.now(),
        mimeType: 'video/webm',
      };

      const { container } = render(<ArtifactRenderer artifact={recording} />);
      
      const video = container.querySelector('video');
      expect(video).toBeTruthy();
      expect(video?.controls).toBe(true);
    });
  });

  describe('Source Context Display', () => {
    it('should show URL source context', () => {
      const screenshot: ArtifactMetadata = {
        id: 'scr_123',
        type: 'screenshot',
        name: 'Screenshot with context',
        filename: 'test.png',
        path: 'screenshots',
        url: 'blob:http://localhost/test.png',
        timestamp: Date.now(),
        mimeType: 'image/png',
        sourceContext: {
          url: 'https://example.com/page',
          pageTitle: 'Example Page',
        },
      };

      render(<ArtifactRenderer artifact={screenshot} />);
      
      expect(screen.getByText('example.com')).toBeTruthy();
    });

    it('should show step name context', () => {
      const screenshot: ArtifactMetadata = {
        id: 'scr_123',
        type: 'screenshot',
        name: 'Screenshot with step',
        filename: 'test.png',
        path: 'screenshots',
        url: 'blob:http://localhost/test.png',
        timestamp: Date.now(),
        mimeType: 'image/png',
        sourceContext: {
          stepName: 'login-form',
        },
      };

      render(<ArtifactRenderer artifact={screenshot} />);
      
      expect(screen.getByText('login-form')).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('should show download action', () => {
      const screenshot: ArtifactMetadata = {
        id: 'scr_123',
        type: 'screenshot',
        name: 'With download',
        filename: 'test.png',
        path: 'screenshots',
        url: 'blob:http://localhost/test.png',
        timestamp: Date.now(),
        mimeType: 'image/png',
      };

      const onDownload = vi.fn();
      render(<ArtifactRenderer artifact={screenshot} showActions onDownload={onDownload} />);
      
      const downloadBtn = screen.getByText('Download');
      expect(downloadBtn).toBeTruthy();
    });

    it('should call onDownload when clicked', () => {
      const screenshot: ArtifactMetadata = {
        id: 'scr_123',
        type: 'screenshot',
        name: 'Downloadable',
        filename: 'test.png',
        path: 'screenshots',
        url: 'blob:http://localhost/test.png',
        timestamp: Date.now(),
        mimeType: 'image/png',
      };

      const onDownload = vi.fn();
      render(<ArtifactRenderer artifact={screenshot} showActions onDownload={onDownload} />);
      
      fireEvent.click(screen.getByText('Download'));
      expect(onDownload).toHaveBeenCalledWith(screenshot);
    });

    it('should show share action', () => {
      const screenshot: ArtifactMetadata = {
        id: 'scr_123',
        type: 'screenshot',
        name: 'Shareable',
        filename: 'test.png',
        path: 'screenshots',
        url: 'blob:http://localhost/test.png',
        timestamp: Date.now(),
        mimeType: 'image/png',
      };

      const onShare = vi.fn();
      render(<ArtifactRenderer artifact={screenshot} showActions onShare={onShare} />);
      
      expect(screen.getByText('Share')).toBeTruthy();
    });

    it('should show delete action', () => {
      const screenshot: ArtifactMetadata = {
        id: 'scr_123',
        type: 'screenshot',
        name: 'Deletable',
        filename: 'test.png',
        path: 'screenshots',
        url: 'blob:http://localhost/test.png',
        timestamp: Date.now(),
        mimeType: 'image/png',
      };

      const onDelete = vi.fn();
      render(<ArtifactRenderer artifact={screenshot} showActions onDelete={onDelete} />);
      
      expect(screen.getByText('Delete')).toBeTruthy();
    });
  });
});

describe('ArtifactList', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render empty state', () => {
    render(<ArtifactList artifacts={[]} />);
    
    expect(screen.getByText('No artifacts yet')).toBeTruthy();
  });

  it('should render list of artifacts', () => {
    const artifacts: ArtifactMetadata[] = [
      {
        id: 'scr_1',
        type: 'screenshot',
        name: 'Screenshot 1',
        filename: 'scr1.png',
        path: 'screenshots',
        url: 'blob:http://localhost/scr1.png',
        timestamp: Date.now(),
        mimeType: 'image/png',
      },
      {
        id: 'rec_1',
        type: 'recording',
        name: 'Recording 1',
        filename: 'rec1.webm',
        path: 'recordings',
        url: 'blob:http://localhost/rec1.webm',
        timestamp: Date.now() - 1000,
        mimeType: 'video/webm',
      },
    ];

    render(<ArtifactList artifacts={artifacts} />);
    
    expect(screen.getByText('Screenshot 1')).toBeTruthy();
    expect(screen.getByText('Recording 1')).toBeTruthy();
  });

  it('should respect limit prop', () => {
    const artifacts: ArtifactMetadata[] = [
      { id: '1', type: 'screenshot', name: 'First', filename: '1.png', path: '', url: 'blob:x', timestamp: 1, mimeType: 'image/png' },
      { id: '2', type: 'screenshot', name: 'Second', filename: '2.png', path: '', url: 'blob:x', timestamp: 2, mimeType: 'image/png' },
      { id: '3', type: 'screenshot', name: 'Third', filename: '3.png', path: '', url: 'blob:x', timestamp: 3, mimeType: 'image/png' },
    ];

    render(<ArtifactList artifacts={artifacts} limit={2} />);
    
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.queryByText('Third')).toBeNull();
  });

  it('should call onDelete when delete button clicked', () => {
    const artifacts: ArtifactMetadata[] = [
      { id: 'del_1', type: 'screenshot', name: 'To Delete', filename: 'del.png', path: '', url: 'blob:x', timestamp: 1, mimeType: 'image/png' },
    ];

    const onDelete = vi.fn();
    const { container } = render(<ArtifactList artifacts={artifacts} onDelete={onDelete} />);
    
    // The delete button is an icon button with Trash2 icon, click on the button element
    const deleteButton = container.querySelector('button');
    expect(deleteButton).toBeTruthy();
    fireEvent.click(deleteButton!);
    expect(onDelete).toHaveBeenCalledWith('del_1');
  });
});

describe('ArtifactEventItem', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render screenshot start event', () => {
    const event: ArtifactEvent = {
      type: 'screenshot_start',
      artifactId: 'scr_123',
      artifactType: 'screenshot',
      timestamp: Date.now(),
    };

    render(<ArtifactEventItem event={event} />);
    
    expect(screen.getByText('Screenshot started')).toBeTruthy();
  });

  it('should render screenshot complete event', () => {
    const event: ArtifactEvent = {
      type: 'screenshot_complete',
      artifactId: 'scr_123',
      artifactType: 'screenshot',
      timestamp: Date.now(),
      sourceContext: { url: 'https://example.com' },
    };

    render(<ArtifactEventItem event={event} />);
    
    expect(screen.getByText('Screenshot captured')).toBeTruthy();
    expect(screen.getByText('example.com')).toBeTruthy();
  });

  it('should render recording start event', () => {
    const event: ArtifactEvent = {
      type: 'recording_start',
      artifactId: 'rec_456',
      artifactType: 'recording',
      timestamp: Date.now(),
    };

    render(<ArtifactEventItem event={event} />);
    
    expect(screen.getByText('Recording started')).toBeTruthy();
  });

  it('should render recording error with suggestion', () => {
    const event: ArtifactEvent = {
      type: 'recording_error',
      artifactId: 'rec_456',
      artifactType: 'recording',
      timestamp: Date.now(),
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Screen capture denied',
        suggestion: 'Check browser permissions',
      },
    };

    render(<ArtifactEventItem event={event} />);
    
    expect(screen.getByText('Recording failed')).toBeTruthy();
    expect(screen.getByText('Screen capture denied')).toBeTruthy();
  });

  it('should show source context with step name', () => {
    const event: ArtifactEvent = {
      type: 'screenshot_complete',
      artifactId: 'scr_123',
      artifactType: 'screenshot',
      timestamp: Date.now(),
      sourceContext: {
        url: 'https://example.com',
        stepName: 'checkout-step',
      },
    };

    render(<ArtifactEventItem event={event} />);
    
    expect(screen.getByText('checkout-step')).toBeTruthy();
  });

  it('should call onClick with artifact ID', () => {
    const event: ArtifactEvent = {
      type: 'screenshot_complete',
      artifactId: 'scr_789',
      artifactType: 'screenshot',
      timestamp: Date.now(),
    };

    const onClick = vi.fn();
    render(<ArtifactEventItem event={event} onClick={onClick} />);
    
    fireEvent.click(screen.getByText('Screenshot captured'));
    expect(onClick).toHaveBeenCalledWith('scr_789');
  });
});

describe('Artifact Panel Integration', () => {
  it('should show formatted file size', () => {
    const screenshot: ArtifactMetadata = {
      id: 'scr_123',
      type: 'screenshot',
      name: 'With size',
      filename: 'test.png',
      path: 'screenshots',
      url: 'blob:http://localhost/test.png',
      timestamp: Date.now(),
      size: 1024 * 1024, // 1MB
      mimeType: 'image/png',
    };

    render(<ArtifactRenderer artifact={screenshot} />);
    
    expect(screen.getByText('1.0 MB')).toBeTruthy();
  });

  it('should handle missing source context gracefully', () => {
    const screenshot: ArtifactMetadata = {
      id: 'scr_123',
      type: 'screenshot',
      name: 'No context',
      filename: 'test.png',
      path: 'screenshots',
      url: 'blob:http://localhost/test.png',
      timestamp: Date.now(),
      mimeType: 'image/png',
    };

    render(<ArtifactRenderer artifact={screenshot} />);
    
    // Should render without errors
    expect(screen.getByText('No context')).toBeTruthy();
  });
});