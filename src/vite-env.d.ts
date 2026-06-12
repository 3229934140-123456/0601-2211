/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    saveFile: (content: string, filename: string, type: string) => Promise<{ success: boolean; path?: string }>;
    openFile: (filters: { name: string; extensions: string[] }[]) => Promise<{ success: boolean; path?: string; content?: string }>;
    exportPdf: (buffer: ArrayBuffer, filename: string) => Promise<{ success: boolean; path?: string }>;
  };
}
