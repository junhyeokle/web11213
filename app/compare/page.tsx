"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { GitCompare, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SingleUpload } from "@/components/compare/single-upload";
import { CompareResultCard } from "@/components/compare/compare-result";
import { ComparisonResult } from "@/lib/types";
import { compareImages } from "@/lib/api";

interface ImageState {
  file: File | null;
  previewUrl: string | null;
}

export default function ComparePage() {
  const [imageA, setImageA] = React.useState<ImageState>({
    file: null,
    previewUrl: null,
  });
  const [imageB, setImageB] = React.useState<ImageState>({
    file: null,
    previewUrl: null,
  });
  const [comparing, setComparing] = React.useState(false);
  const [result, setResult] = React.useState<ComparisonResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleFile = (which: "A" | "B") => (file: File) => {
    const setter = which === "A" ? setImageA : setImageB;
    const current = which === "A" ? imageA : imageB;
    if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
    setter({ file, previewUrl: URL.createObjectURL(file) });
    setResult(null);
    setError(null);
  };

  const handleClear = (which: "A" | "B") => () => {
    const current = which === "A" ? imageA : imageB;
    if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
    const setter = which === "A" ? setImageA : setImageB;
    setter({ file: null, previewUrl: null });
    setResult(null);
    setError(null);
  };

  const handleCompare = async () => {
    if (!imageA.file || !imageB.file) return;
    setError(null);
    setComparing(true);
    try {
      const res = await compareImages(imageA.file, imageB.file);
      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "비교 중 오류가 발생했습니다";
      setError(msg);
    } finally {
      setComparing(false);
    }
  };

  const ready = imageA.file && imageB.file;

  return (
    <div className="container py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
          <GitCompare className="h-3.5 w-3.5" />
          이미지 비교
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          두 이미지가{" "}
          <span className="text-gradient">얼마나 비슷한지</span> 확인
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          내 이미지와 비교 대상 이미지를 업로드하면 강화 지문과 워터마크를
          종합 분석해 유사도를 판정합니다.
        </p>
      </motion.div>

      {/* 듀얼 업로드 + 비교 버튼 */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-stretch mb-8">
        <SingleUpload
          label="내 이미지"
          description="비교 기준이 될 이미지"
          accentColor="blue"
          file={imageA.file}
          previewUrl={imageA.previewUrl}
          onFile={handleFile("A")}
          onClear={handleClear("A")}
        />

        <div className="hidden lg:flex items-center justify-center">
          <div className="rounded-full border-2 border-dashed border-border p-3 bg-card">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <SingleUpload
          label="비교 대상 이미지"
          description="비교하고 싶은 다른 이미지"
          accentColor="violet"
          file={imageB.file}
          previewUrl={imageB.previewUrl}
          onFile={handleFile("B")}
          onClear={handleClear("B")}
        />
      </div>

      {/* 비교 시작 버튼 */}
      <div className="flex justify-center mb-12">
        <Button
          size="lg"
          onClick={handleCompare}
          disabled={!ready || comparing}
          className="min-w-[240px]"
        >
          {comparing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              비교 중...
            </>
          ) : (
            <>
              <GitCompare className="h-4 w-4" />
              {ready ? "이미지 비교 시작" : "두 이미지 모두 업로드하세요"}
            </>
          )}
        </Button>
      </div>

      {/* 에러 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto mb-8 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex gap-3"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <div className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1">
              비교 실패
            </div>
            <p className="text-sm text-red-700/80 dark:text-red-400/80">
              {error}
            </p>
          </div>
        </motion.div>
      )}

      {/* 결과 */}
      {result && <CompareResultCard result={result} />}

      {/* 빈 상태 안내 */}
      {!result && !comparing && !error && (
        <div className="max-w-md mx-auto text-center py-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            두 이미지를 업로드한 뒤 비교 시작 버튼을 누르세요.
            <br />
            워터마크가 있는 이미지면 더 정확한 매칭이 가능합니다.
          </p>
        </div>
      )}
    </div>
  );
}
