"use client";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComparisonResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  result: ComparisonResult;
}

const verdictConfig = {
  exact: {
    icon: CheckCircle2,
    color: "emerald",
    bgClass: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/30",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  likely: {
    icon: AlertCircle,
    color: "amber",
    bgClass: "from-amber-500/10 to-amber-500/5 border-amber-500/30",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  possibly: {
    icon: AlertTriangle,
    color: "orange",
    bgClass: "from-orange-500/10 to-orange-500/5 border-orange-500/30",
    textClass: "text-orange-700 dark:text-orange-400",
  },
  different: {
    icon: XCircle,
    color: "slate",
    bgClass: "from-slate-500/10 to-slate-500/5 border-slate-500/30",
    textClass: "text-slate-700 dark:text-slate-400",
  },
};

const hashLabels: Record<string, { name: string; desc: string }> = {
  phash: { name: "pHash", desc: "전체 구조 (DCT 저주파)" },
  dhash: { name: "dHash", desc: "밝기 그래디언트" },
  chash: { name: "cHash", desc: "색상 분포 (HSV)" },
  block4: { name: "블록 4×4", desc: "16개 블록 평균" },
  block8: { name: "블록 8×8", desc: "64개 블록 평균" },
};

export function CompareResultCard({ result }: Props) {
  const cfg = verdictConfig[result.verdict];
  const VerdictIcon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 종합 점수 카드 */}
      <Card className={`bg-gradient-to-br ${cfg.bgClass} overflow-hidden`}>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-stretch gap-8">
            <div className="flex-1 text-center md:text-left">
              <div className={`inline-flex items-center gap-2 ${cfg.textClass} text-sm font-medium mb-2`}>
                <VerdictIcon className="h-4 w-4" />
                판정
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-3">
                {result.verdictLabel}
              </div>
              {result.watermarkMatch ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  같은 워터마크 발견:{" "}
                  <code className="font-mono">{result.watermarkMatch}</code>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  강화 지문(5종 해시)을 종합한 결과입니다.
                </p>
              )}
            </div>

            <div className="flex flex-col items-center justify-center min-w-[160px] border-l-0 md:border-l md:pl-8">
              <div className="text-xs text-muted-foreground font-medium mb-1">
                종합 유사도
              </div>
              <div
                className={cn(
                  "text-6xl md:text-7xl font-bold tabular-nums",
                  cfg.textClass
                )}
              >
                {result.similarity}
                <span className="text-2xl ml-1 align-top">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 해시별 세부 점수 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            해시별 세부 유사도
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            서로 다른 5가지 해시가 각각 다른 변형 유형을 잡아냅니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(["phash", "dhash", "chash", "block4", "block8"] as const).map(
            (key) => {
              const value = result.details[key];
              const meta = hashLabels[key];
              return (
                <HashBar
                  key={key}
                  name={meta.name}
                  desc={meta.desc}
                  value={value}
                />
              );
            }
          )}
        </CardContent>
      </Card>

      {/* 워터마크 추출 결과 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            워터마크 추출 결과
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            각 이미지에서 4단계 타일 워터마크 추출을 시도했습니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <WatermarkRow
            label="이미지 1 (내 이미지)"
            value={result.watermark1}
          />
          <WatermarkRow
            label="이미지 2 (비교 대상)"
            value={result.watermark2}
          />
          {result.watermarkMatch && (
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4 flex gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                  동일 자산 확인됨
                </div>
                <p className="text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                  두 이미지에서 같은 워터마크{" "}
                  <code className="font-mono bg-card px-1.5 py-0.5 rounded">
                    {result.watermarkMatch}
                  </code>
                  가 검출되었습니다. 두 이미지는 확실히 같은 자산입니다.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HashBar({
  name,
  desc,
  value,
}: {
  name: string;
  desc: string;
  value: number;
}) {
  // 색상: 80↑ 초록, 60↑ 주황, 그 외 회색
  const barColor =
    value >= 80
      ? "from-emerald-500 to-emerald-400"
      : value >= 60
        ? "from-amber-500 to-amber-400"
        : "from-slate-400 to-slate-300";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">{name}</span>
          <span className="text-xs text-muted-foreground">{desc}</span>
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {value}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
        />
      </div>
    </div>
  );
}

function WatermarkRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        {value ? (
          <code className="text-sm font-mono break-all">{value}</code>
        ) : (
          <span className="text-sm text-muted-foreground italic">
            워터마크 없음 또는 추출 실패
          </span>
        )}
      </div>
      <Badge variant={value ? "success" : "muted"}>
        {value ? "추출됨" : "없음"}
      </Badge>
    </div>
  );
}
