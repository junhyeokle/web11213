"use client";
import * as React from "react";
import { Upload, ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  file: File | null;
  previewUrl: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function UploadArea({ file, previewUrl, onFile, onClear }: UploadAreaProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.type.startsWith("image/")) onFile(f);
  };

  if (file && previewUrl) {
    return (
      <div className="rounded-3xl border bg-card overflow-hidden">
        <div className="relative bg-muted/30 flex items-center justify-center min-h-[400px] max-h-[600px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="미리보기"
            className="max-h-[600px] w-auto object-contain"
          />
          <button
            onClick={onClear}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur shadow-lg hover:bg-background transition"
            aria-label="제거"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 flex items-center gap-3 border-t">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative rounded-3xl border-2 border-dashed bg-card cursor-pointer transition-all",
        "min-h-[440px] flex flex-col items-center justify-center p-12 text-center",
        dragOver
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/50 hover:bg-accent/30"
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-primary mb-6">
        <Upload className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-semibold mb-2">이미지를 끌어다 놓으세요</h3>
      <p className="text-sm text-muted-foreground mb-6">
        또는 클릭해서 파일을 선택할 수 있습니다
      </p>
      <div className="text-xs text-muted-foreground">JPG, PNG, WEBP · 최대 20MB</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
