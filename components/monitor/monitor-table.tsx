"use client";
import { Globe2, Trash2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonitoredSite } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

interface Props {
  sites: MonitoredSite[];
  loading: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
}

const freqLabel: Record<MonitoredSite["frequency"], string> = {
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
};

export function MonitorTable({ sites, loading, onToggle, onRemove }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sites.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Globe2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">등록된 사이트가 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            모니터링할 사이트를 추가해 자동 검사를 시작하세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        {sites.map((s) => (
          <div key={s.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Globe2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <Badge
                    variant={
                      s.status === "active"
                        ? "success"
                        : s.status === "paused"
                          ? "muted"
                          : "danger"
                    }
                  >
                    {s.status === "active"
                      ? "활성"
                      : s.status === "paused"
                        ? "일시중지"
                        : "오류"}
                  </Badge>
                  {s.detections > 0 && (
                    <Badge variant="warning">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {s.detections}건 탐지
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.url}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-6 text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">주기</div>
                  <div className="font-medium">{freqLabel[s.frequency]}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">마지막 검사</div>
                  <div className="font-medium">
                    {s.lastScan ? formatRelativeTime(s.lastScan) : "—"}
                  </div>
                </div>
              </div>
              <Switch
                checked={s.enabled}
                onCheckedChange={(checked) => onToggle(s.id, checked)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(s.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
