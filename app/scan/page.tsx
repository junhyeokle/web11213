"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Search, Loader2, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanResults } from "@/components/scan/scan-results";
import { ScanMatch } from "@/lib/types";
import { scanWebsite } from "@/lib/mock-api";

export default function ScanPage() {
  const [url, setUrl] = React.useState("");
  const [scanning, setScanning] = React.useState(false);
  const [results, setResults] = React.useState<ScanMatch[] | null>(null);
  const [progress, setProgress] = React.useState(0);

  const handleScan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setResults(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 95));
    }, 200);

    try {
      const r = await scanWebsite(url);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => setResults(r), 300);
    } finally {
      clearInterval(interval);
      setScanning(false);
    }
  };

  return (
    <div className="container py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
          <Search className="h-3.5 w-3.5" />
          사이트 검사
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          웹사이트의 <span className="text-gradient">이미지를 검사</span>합니다
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          URL을 입력하면 페이지 내 모든 이미지에서 워터마크와 지문 매칭을 자동으로
          검사합니다.
        </p>
      </motion.div>

      <div className="max-w-3xl mx-auto mb-10">
        <div className="rounded-3xl border bg-card shadow-lg p-2 flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-3 flex-1 px-4">
            <Globe2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              type="url"
              placeholder="https://example.com/post/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-12"
            />
          </div>
          <Button
            onClick={handleScan}
            disabled={!url.trim() || scanning}
            size="lg"
          >
            {scanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                검사 중
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                검사 시작
              </>
            )}
          </Button>
        </div>
      </div>

      {scanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-3xl mx-auto"
        >
          <div className="rounded-3xl border bg-card p-8">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="font-medium">사이트 분석 중...</div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted mb-2">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>이미지 수집 및 워터마크 추출 중...</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </motion.div>
      )}

      {results && <ScanResults results={results} />}

      {!scanning && results === null && (
        <div className="max-w-md mx-auto text-center py-16">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">검사할 URL을 입력해주세요</h3>
          <p className="text-sm text-muted-foreground">
            블로그, 뉴스 사이트 등 검사하고 싶은 페이지의 URL을 입력하면 자동으로
            분석합니다.
          </p>
        </div>
      )}
    </div>
  );
}
