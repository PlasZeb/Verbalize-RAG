import React, { useCallback, useState, useEffect } from 'react';
import { FileData } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

interface FileUploaderProps {
  onFileLoaded: (file: FileData) => void;
  disabled: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded, disabled }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    return fullText;
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      let content = '';
      
      if (file.type === 'application/pdf') {
        content = await extractTextFromPDF(file);
      } else {
        // Text based handling
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsText(file);
        });
      }

      onFileLoaded({
        name: file.name,
        size: file.size,
        type: file.type,
        content: content
      });
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Error processing file. If it's a PDF, ensure it contains selectable text, not just images.");
    } finally {
      setIsProcessing(false);
    }
  }, [onFileLoaded]);

  const isDisabled = disabled || isProcessing;

  return (
    <div className={`relative group ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
      <div className="relative bg-slate-900 rounded-lg p-6 border border-slate-800 text-center">
        {isProcessing ? (
           <div className="flex flex-col items-center justify-center py-2">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mb-2"></div>
             <p className="text-sm text-teal-400">Processing Document...</p>
           </div>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-teal-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-slate-300 font-medium mb-1">
              Upload Context Source
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Support for PDF, .txt, .md, .csv, .json
            </p>
            
            <label className="inline-block cursor-pointer">
              <span className="px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-teal-500/20">
                Choose File
              </span>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.txt,.md,.csv,.json,.js,.ts,.tsx,.html"
                onChange={handleFileChange}
                disabled={isDisabled}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
};