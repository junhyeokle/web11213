"use client";
import { motion } from "framer-motion";
import {
  Shield,
  Eye,
  Fingerprint,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export function FloatingDashboard() {
  return (
    <div className="relative max-w-5xl mx-auto">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative rounded-3xl border bg-card shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="ml-3 text-xs text-muted-foreground">
            imageguard.app/dashboard
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 p-6 bg-gradient-to-br from-background to-muted/20">
          <StatCard
            icon={<Shield className="h-4 w-4" />}
            label="보호 중"
            value="124"
            trend="+12"
            color="blue"
          />
          <StatCard
            icon={<Eye className="h-4 w-4" />}
            label="스캔 사이트"
            value="38"
            trend="+5"
            color="indigo"
          />
          <StatCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="발견된 도용"
            value="3"
            trend="신규"
            color="amber"
          />

          <div className="md:col-span-3 rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-sm">최근 탐지 결과</div>
              <div className="text-xs text-muted-foreground">실시간</div>
            </div>
            <div className="space-y-2">
              <DetectionRow
                img="seed/d1"
                url="example-blog.com"
                similarity={96}
                watermark
              />
              <DetectionRow
                img="seed/d2"
                url="news-site.com"
                similarity={82}
              />
              <DetectionRow
                img="seed/d3"
                url="another-site.com"
                similarity={67}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        className="absolute -top-8 -right-4 md:right-12 hidden md:block"
      >
        <div className="rounded-2xl border bg-card shadow-xl p-4 w-64">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">지문 등록 완료</div>
              <div className="text-sm font-semibold">a3f7b2c91e4d8f06</div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute -bottom-6 -left-4 md:left-12 hidden md:block"
      >
        <div className="rounded-2xl border bg-card shadow-xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">워터마크 활성</div>
              <div className="text-sm font-semibold">WM-9F3A-2026</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  color: "blue" | "indigo" | "amber";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600",
    indigo: "bg-indigo-500/10 text-indigo-600",
    amber: "bg-amber-500/10 text-amber-600",
  };
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}
        >
          {icon}
        </div>
        <span className="text-xs font-medium text-emerald-600">{trend}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function DetectionRow({
  img,
  url,
  similarity,
  watermark,
}: {
  img: string;
  url: string;
  similarity: number;
  watermark?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
      <div
        className="h-10 w-10 rounded-lg bg-cover bg-center"
        style={{
          backgroundImage: `url(https://picsum.photos/${img}/80/80)`,
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{url}</div>
        <div className="text-xs text-muted-foreground">유사도 {similarity}%</div>
      </div>
      {watermark && (
        <div className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
          워터마크
        </div>
      )}
    </div>
  );
}
