"use client";
import * as React from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanMatch } from "@/lib/types";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "all", label: "전체" },
  { id: "high", label: "높은 위험" },
  { id: "watermark", label: "워터마크 탐지" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ScanResults({ results }: { results: ScanMatch[] }) {
  const [tab, setTab] = React.useState<TabId>("all");

  const filtered = results.filter((r) => {
    if (tab === "high") return r.riskLevel === "high";
    if (tab === "watermark") return r.watermarkDetected;
    return true;
  });

  const stats = {
    total: results.length,
    high: results.filter((r) => r.riskLevel === "high").length,
    watermark: results.filter((r) => r.watermarkDetected).length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatBox label="검출된 이미지" value={stats.total} color="blue" />
        <StatBox label="높은 위험도" value={stats.high} color="red" />
        <StatBox
          label="워터마크 탐지"
          value={stats.watermark}
          color="emerald"
        />
      </div>

      <div className="rounded-3xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  tab === t.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            필터
          </Button>
        </div>

        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              조건에 맞는 결과가 없습니다.
            </div>
          ) : (
            filtered.map((r) => <ResultRow key={r.id} match={r} />)
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "red" | "emerald";
}) {
  const colors = {
    blue: "from-blue-500/10 to-blue-500/5 text-blue-700 dark:text-blue-400",
    red: "from-red-500/10 to-red-500/5 text-red-700 dark:text-red-400",
    emerald:
      "from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${colors[color]} p-5`}
    >
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function ResultRow({ match }: { match: ScanMatch }) {
  const riskMap = {
    high: { label: "높음", variant: "danger" as const, icon: AlertCircle },
    medium: {
      label: "보통",
      variant: "warning" as const,
      icon: AlertTriangle,
    },
    low: { label: "낮음", variant: "muted" as const, icon: AlertTriangle },
  };
  const risk = riskMap[match.riskLevel];
  const RiskIcon = risk.icon;

  return (
    <div className="flex items-center gap-4 p-5 hover:bg-accent/30 transition-colors">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={match.thumbnailUrl}
        alt=""
        className="h-20 w-20 rounded-2xl object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Badge variant={risk.variant}>
            <RiskIcon className="h-3 w-3 mr-1" />
            위험도 {risk.label}
          </Badge>
          {match.watermarkDetected && (
            <Badge variant="success">
              <ShieldCheck className="h-3 w-3 mr-1" />
              워터마크 탐지됨
            </Badge>
          )}
          <Badge variant="default">유사도 {match.similarity}%</Badge>
        </div>
        <div className="text-sm font-medium truncate mb-1">{match.pageUrl}</div>
        {match.matchedAssetId && (
          <div className="text-xs text-muted-foreground">
            매칭 자산:{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded">
              {match.matchedAssetId}
            </code>
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" asChild>
        <a href={match.pageUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          페이지 보기
        </a>
      </Button>
    </div>
  );
}
