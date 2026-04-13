import { useState, useRef, type DragEvent } from 'react';

interface FileDropZoneProps {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
  currentFile?: File | null;
  disabled?: boolean;
}

export function FileDropZone({
  onFile,
  accept = '.pdf,.doc,.docx,.ppt,.pptx,.zip',
  label = 'Drop PDF or Doc here',
  currentFile,
  disabled = false,
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative flex flex-col items-center justify-center gap-2
        rounded-xl border-2 border-dashed p-8
        transition-all duration-200 cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${dragOver
          ? 'border-cyan bg-cyan/5 scale-[1.01]'
          : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke={dragOver ? '#00E5FF' : 'rgba(255,255,255,0.25)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      {currentFile ? (
        <p className="text-sm text-cyan font-medium truncate max-w-full">
          {currentFile.name}
        </p>
      ) : (
        <>
          <p className="text-sm text-white/40">{label}</p>
          <p className="text-[11px] text-white/20">{accept.replace(/\./g, '').toUpperCase()}</p>
        </>
      )}
    </div>
  );
}
