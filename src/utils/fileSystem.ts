/**
 * Real file system operations using IndexedDB as primary storage
 * Falls back to in-memory storage when File System Access API is not available
 */

import { storage } from './storage';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

// In-memory fallback storage
const inMemoryFS: Map<string, FileNode> = new Map();

const defaultFS: FileNode = {
  name: '',
  path: '/',
  type: 'folder',
  children: [
    { name: 'src', path: '/src', type: 'folder', children: [
      { name: 'main.tsx', path: '/src/main.tsx', type: 'file', content: '// Entry point' },
      { name: 'App.tsx', path: '/src/App.tsx', type: 'file', content: '// AI-MAOS app' },
    ]},
    { name: 'public', path: '/public', type: 'folder', children: [] },
    { name: 'agents', path: '/agents', type: 'folder', children: [] },
    { name: 'skills', path: '/skills', type: 'folder', children: [
      { name: 'README.md', path: '/skills/README.md', type: 'file', content: '# Skills\nUpload .md or .zip to extend agents.' }
    ]},
    { name: 'models', path: '/models', type: 'folder', children: [] },
    { name: 'prompts', path: '/prompts', type: 'folder', children: [] },
    { name: 'workflows', path: '/workflows', type: 'folder', children: [] },
    { name: 'docs', path: '/docs', type: 'folder', children: [] },
    { name: 'integrations', path: '/integrations', type: 'folder', children: [
      { name: 'pollinations.md', path: '/integrations/pollinations.md', type: 'file', content: '# Pollinations\nBase: https://gen.pollinations.ai\n- text: /text/{prompt}\n- image: /image/{prompt}\n- video: /video/{prompt}\n- audio: /audio/{text}' }
    ]},
    { name: 'projects', path: '/projects', type: 'folder', children: [] },
    { name: 'backups', path: '/backups', type: 'folder', children: [] },
  ],
};

// Initialize default file system
export async function initFileSystem(): Promise<void> {
  try {
    await storage.init();
    
    // Check if we have any files in storage
    const files = await storage.listFiles('/');
    if (files.length === 0) {
      // Initialize with default structure
      const initializeNode = async (node: FileNode) => {
        if (node.type === 'file' && node.content) {
          await storage.writeFile(node.path, node.name, node.content);
        }
        if (node.children) {
          for (const child of node.children) {
            await initializeNode(child);
          }
        }
      };
      
      await initializeNode(defaultFS);
    }
  } catch (error) {
    console.warn('IndexedDB not available, falling back to in-memory storage:', error);
    // Initialize in-memory storage with defaults
    const initializeNode = (node: FileNode) => {
      inMemoryFS.set(node.path, node);
      if (node.children) {
        for (const child of node.children) {
          initializeNode(child);
        }
      }
    };
    initializeNode(defaultFS);
  }
}

/**
 * List files in a directory
 */
export async function listFiles(path: string): Promise<FileNode[]> {
  try {
    const files = await storage.listFiles(path);
    return files.map(f => ({
      name: f.name,
      path: f.path,
      type: f.type,
      content: f.content,
    }));
  } catch (error) {
    console.warn('Using in-memory storage for listFiles:', error);
    // Fallback to in-memory
    const results: FileNode[] = [];
    for (const [_nodePath, node] of inMemoryFS.entries()) {
      const parentPath = path === '/' ? '' : path;
      const nodeParentPath = node.path.substring(0, node.path.lastIndexOf('/')) || '/';

      if (nodeParentPath === parentPath || (parentPath === '' && nodeParentPath === '/')) {
        results.push(node);
      }
    }
    return results;
  }
}

/**
 * Read file contents
 */
export async function readFile(path: string): Promise<string | null> {
  try {
    const record = await storage.readFile(path);
    return record?.content || null;
  } catch (error) {
    console.warn('Using in-memory storage for readFile:', error);
    const node = inMemoryFS.get(path);
    return node?.content || null;
  }
}

/**
 * Write file contents
 */
export async function writeFile(path: string, content: string): Promise<void> {
  const name = path.substring(path.lastIndexOf('/') + 1);
  
  try {
    await storage.writeFile(path, name, content);
  } catch (error) {
    console.warn('Using in-memory storage for writeFile:', error);
    const node: FileNode = {
      name,
      path,
      type: 'file',
      content,
    };
    inMemoryFS.set(path, node);
  }
}

/**
 * Create a directory
 */
export async function createDirectory(path: string): Promise<void> {
  const name = path.substring(path.lastIndexOf('/') + 1);
  
  try {
    // In our simple implementation, we just mark it as existing
    // For now, we'll use writeFile to create a marker
    await storage.writeFile(path, name, '');
  } catch (error) {
    console.warn('Using in-memory storage for createDirectory:', error);
    const node: FileNode = {
      name,
      path,
      type: 'folder',
      children: [],
    };
    inMemoryFS.set(path, node);
  }
}

/**
 * Check if a file or directory exists
 */
export async function exists(path: string): Promise<boolean> {
  try {
    const record = await storage.readFile(path);
    return record !== null;
  } catch (error) {
    return inMemoryFS.has(path);
  }
}

/**
 * Get file tree structure for a path
 */
export async function getTree(path: string = '/'): Promise<FileNode> {
  const children = await listFiles(path);
  
  // Recursively build tree for folders
  const processedChildren: FileNode[] = [];
  for (const child of children) {
    if (child.type === 'folder') {
      processedChildren.push(await getTree(child.path));
    } else {
      processedChildren.push(child);
    }
  }
  
  return {
    name: path === '/' ? 'root' : path.substring(path.lastIndexOf('/') + 1),
    path,
    type: 'folder',
    children: processedChildren,
  };
}
