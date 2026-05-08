"use client";
import * as React from "react";
import { Upload, ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SingleUploadProps {
  label: string;
  description: string;
  accentColor: "blue" | "violet";
  file: File | null;
  previewUrl: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function SingleUpload({
  label,
  description,
  accentColor,
  file,
  previewUrl,
  onFile,
  onClear,
}: SingleUploadProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const accentClasses = {
    blue: {
      label: "text-blue-600",
      bg: "bg-blue-500/10",
      ring: "ring-blue-500/30",
      border: "border-blue-500/40",
      hover: "hover:border-blue-500/40",
    },
    violet: {
      label: "text-violet-600",
      bg: "bg-violet-500/10",
      ring: "ring-violet-500/30",
      border: "border-violet-500/40",
      hover: "hover:border-violet-500/40",
    },
  }[accentColor];

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.type.startsWith("image/")) onFile(f);
  };

  if (file && previewUrl) {
    return (
      <div className="rounded-3xl border bg-card overflow-hidden">
        <div className={`px-5 py-3 border-b ${accentClasses.bg}`}>
          <div className={`text-sm font-semibold ${accentClasses.label}`}>
            {label}
          </div>
        </div>
        <div className="relative bg-muted/30 flex items-center justify-center min-h-[280px] max-h-[400px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={label}
            className="max-h-[400px] w-auto object-contain"
          />
          <button
            onClick={onClear}
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur shadow-lg hover:bg-background transition"
            aria-label="제거"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 flex items-center gap-3 border-t">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentClasses.bg} ${accentClasses.label}`}
          >
            <ImageIcon className="h-4 w-4" />
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
    <div className="rounded-3xl border bg-card overflow-hidden">
      <div className={`px-5 py-3 border-b ${accentClasses.bg}`}>
        <div className={`text-sm font-semibold ${accentClasses.label}`}>
          {label}
        </div>
      </div>
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
          "relative cursor-pointer transition-all min-h-[320px] flex flex-col items-center justify-center p-10 text-center",
          "border-2 border-dashed",
          dragOver
            ? `${accentClasses.border} ${accentClasses.bg}`
            : `border-border ${accentClasses.hover} hover:bg-accent/30`
        )}
      >
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accentClasses.bg} ${accentClasses.label} mb-4`}
        >
          <Upload className="h-6 w-6" />
        </div>
        <h3 className="font-semibold mb-1">이미지를 끌어다 놓으세요</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {description}
        </p>
        <div className="text-xs text-muted-foreground">
          JPG, PNG, WEBP · 최소 128×128
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
