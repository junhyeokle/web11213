"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonitoredSite } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    data: Omit<
      MonitoredSite,
      "id" | "lastScan" | "nextScan" | "detections" | "status"
    >
  ) => Promise<void>;
}

const frequencies = [
  { value: "daily", label: "매일", desc: "24시간마다 자동 검사" },
  { value: "weekly", label: "매주", desc: "7일마다 자동 검사" },
  { value: "monthly", label: "매월", desc: "30일마다 자동 검사" },
] as const;

export function AddSiteDialog({ open, onOpenChange, onAdd }: Props) {
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [frequency, setFrequency] = React.useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({
        name: name.trim() || url,
        url: url.trim(),
        frequency,
        enabled: true,
      });
      onOpenChange(false);
      setName("");
      setUrl("");
      setFrequency("daily");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg rounded-3xl border bg-card p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <DialogPrimitive.Title className="text-xl font-semibold">
                    모니터링 사이트 추가
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close className="rounded-full p-2 hover:bg-accent">
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">사이트 이름</label>
                    <Input
                      placeholder="예: 내 블로그"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL</label>
                    <div className="relative">
                      <Globe2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">검사 주기</label>
                    <div className="grid gap-2">
                      {frequencies.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setFrequency(f.value)}
                          className={cn(
                            "flex items-center justify-between rounded-2xl border p-4 text-left transition-colors",
                            frequency === f.value
                              ? "border-primary bg-primary/5"
                              : "hover:bg-accent/30"
                          )}
                        >
                          <div>
                            <div className="font-medium text-sm">{f.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {f.desc}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                              frequency === f.value
                                ? "border-primary bg-primary"
                                : "border-input"
                            )}
                          >
                            {frequency === f.value && (
                              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenChange(false)}
                    >
                      취소
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSubmit}
                      disabled={!url.trim() || submitting}
                    >
                      {submitting ? "추가 중..." : "추가하기"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
