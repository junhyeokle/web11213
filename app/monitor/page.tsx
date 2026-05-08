"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Bell, Plus, AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MonitorTable } from "@/components/monitor/monitor-table";
import { AddSiteDialog } from "@/components/monitor/add-site-dialog";
import { MonitoredSite, DetectionAlert } from "@/lib/types";
import {
  getMonitoredSites,
  getRecentAlerts,
  addMonitoredSite,
  toggleSite,
  removeSite,
} from "@/lib/mock-api";
import { formatRelativeTime } from "@/lib/utils";

export default function MonitorPage() {
  const [sites, setSites] = React.useState<MonitoredSite[]>([]);
  const [alerts, setAlerts] = React.useState<DetectionAlert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    Promise.all([getMonitoredSites(), getRecentAlerts()])
      .then(([s, a]) => {
        setSites(s);
        setAlerts(a);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (
    data: Omit<
      MonitoredSite,
      "id" | "lastScan" | "nextScan" | "detections" | "status"
    >
  ) => {
    const newSite = await addMonitoredSite(data);
    setSites((prev) => [newSite, ...prev]);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleSite(id, enabled);
    setSites((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, enabled, status: enabled ? "active" : "paused" }
          : s
      )
    );
  };

  const handleRemove = async (id: string) => {
    await removeSite(id);
    setSites((prev) => prev.filter((s) => s.id !== id));
  };

  const stats = {
    total: sites.length,
    active: sites.filter((s) => s.enabled).length,
    detections: sites.reduce((sum, s) => sum + s.detections, 0),
    unread: alerts.filter((a) => !a.read).length,
  };

  return (
    <div className="container py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <Bell className="h-3.5 w-3.5" />
            자동 모니터링
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            등록한 사이트를{" "}
            <span className="text-gradient">자동으로 감시</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            여러 사이트를 정기적으로 검사하고 도용이 발견되면 알림을 보내드립니다.
          </p>
        </div>
        <Button size="lg" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          사이트 추가
        </Button>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <StatWidget
          icon={Eye}
          label="등록 사이트"
          value={stats.total}
          color="blue"
        />
        <StatWidget
          icon={CheckCircle2}
          label="활성 모니터링"
          value={stats.active}
          color="emerald"
        />
        <StatWidget
          icon={AlertCircle}
          label="누적 탐지"
          value={stats.detections}
          color="amber"
        />
        <StatWidget
          icon={Bell}
          label="읽지 않은 알림"
          value={stats.unread}
          color="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonitorTable
            sites={sites}
            loading={loading}
            onToggle={handleToggle}
            onRemove={handleRemove}
          />
        </div>

        <div>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">최근 알림</div>
                <span className="text-xs rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-600 font-medium">
                  {stats.unread}건
                </span>
              </div>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  알림이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`flex gap-3 rounded-2xl border p-3 ${!a.read ? "bg-primary/5 border-primary/20" : "bg-card"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.imageUrl}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {a.siteUrl}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-amber-600">
                            유사도 {a.similarity}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(a.detectedAt)}
                          </span>
                        </div>
                      </div>
                      {!a.read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddSiteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAdd}
      />
    </div>
  );
}

function StatWidget({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "blue" | "emerald" | "amber" | "violet";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    violet: "bg-violet-500/10 text-violet-600",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
