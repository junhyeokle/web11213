"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Copy, ExternalLink, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProtectionResult } from "@/lib/types";

export function ResultCard({ result }: { result: ProtectionResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            보호 완료
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            자산 ID:{" "}
            <code className="text-xs bg-muted px-2 py-0.5 rounded">
              {result.id}
            </code>
          </p>
          {result.isNewCustomer && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <UserCheck className="h-3 w-3" />새 고객으로 등록되었습니다
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ResultItem label="AI 노이즈" enabled={result.noise} />
            <ResultItem label="워터마크" enabled={result.watermark} />
            <ResultItem label="지문 등록" enabled={result.fingerprint} />
            <ResultItem label="화질 점수" value={`${result.qualityScore}/100`} />
          </div>

          {result.fingerprintHash && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">지문 해시</div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono flex-1 break-all">
                  {result.fingerprintHash}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    navigator.clipboard.writeText(result.fingerprintHash!)
                  }
                  aria-label="복사"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {result.watermarkId && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">
                워터마크 ID
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono flex-1 break-all">
                  {result.watermarkId}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    navigator.clipboard.writeText(result.watermarkId!)
                  }
                  aria-label="복사"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {result.downloadUrl ? (
            <div className="space-y-2">
              <Button asChild className="w-full" size="lg">
                <a
                  href={result.downloadUrl}
                  download={result.filename || "protected_image.png"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" />
                  보호된 이미지 다운로드
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full" size="sm">
                <a
                  href={result.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  새 탭에서 열기
                </a>
              </Button>
            </div>
          ) : (
            <Button className="w-full" size="lg" disabled>
              <Download className="h-4 w-4" />
              다운로드 URL 없음
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ResultItem({
  label,
  enabled,
  value,
}: {
  label: string;
  enabled?: boolean;
  value?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {value !== undefined ? (
        <div className="text-lg font-semibold">{value}</div>
      ) : (
        <Badge variant={enabled ? "success" : "muted"}>
          {enabled ? "적용됨" : "미적용"}
        </Badge>
      )}
    </div>
  );
}
