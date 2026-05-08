"use client";
import * as React from "react";
import {
  AlertTriangle,
  Loader2,
  Shield,
  Sparkles,
  Eye,
  Fingerprint,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ProtectionOptions } from "@/lib/types";

interface Props {
  options: ProtectionOptions;
  onChange: (o: ProtectionOptions) => void;
  onProcess: () => void;
  processing: boolean;
  disabled: boolean;
}

export function ProtectionOptionsCard({
  options,
  onChange,
  onProcess,
  processing,
  disabled,
}: Props) {
  const toggle = (key: keyof ProtectionOptions) =>
    onChange({ ...options, [key]: !options[key] });

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          보호 옵션
        </CardTitle>
        <CardDescription>적용할 보호 기능을 선택하세요</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <OptionRow
          checked={options.applyAINoise}
          onToggle={() => toggle("applyAINoise")}
          icon={<Sparkles className="h-5 w-5" />}
          iconColor="bg-violet-500/10 text-violet-600"
          title="AI 적대적 노이즈"
          desc="AI 학습/변형 방해"
          badge="곧 출시"
        />
        <OptionRow
          checked={options.applyWatermark}
          onToggle={() => toggle("applyWatermark")}
          icon={<Eye className="h-5 w-5" />}
          iconColor="bg-blue-500/10 text-blue-600"
          title="비가시 워터마크"
          desc="추적 가능한 식별자 삽입"
        />
        <OptionRow
          checked={options.generateFingerprint}
          onToggle={() => toggle("generateFingerprint")}
          icon={<Fingerprint className="h-5 w-5" />}
          iconColor="bg-emerald-500/10 text-emerald-600"
          title="이미지 지문 생성"
          desc="시각적 특징 해시 등록"
        />

        {(options.applyAINoise || options.applyWatermark) && (
          <div className="rounded-2xl border bg-amber-500/5 border-amber-500/20 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  화질 영향 안내
                </div>
                <p className="text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                  AI 적대적 노이즈와 비가시 워터마크는 이미지 화질에 약간 영향을
                  줄 수 있습니다. 강도가 높을수록 보호 효과는 강해지지만 화질
                  손실도 커집니다.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">보호 강도</label>
            <span className="text-sm font-semibold text-primary">
              {options.strength}
            </span>
          </div>
          <Slider
            value={[options.strength]}
            min={10}
            max={100}
            step={5}
            onValueChange={([v]) => onChange({ ...options, strength: v })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>약하게 (화질 우선)</span>
            <span>강하게 (보호 우선)</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">메타데이터 (선택)</label>
          <Input
            placeholder="예: ASSET-2026-XYZ"
            value={options.metadata || ""}
            onChange={(e) => onChange({ ...options, metadata: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            워터마크에 삽입할 식별자입니다. 비워두면 자동 생성됩니다.
          </p>
        </div>

        <Button
          onClick={onProcess}
          disabled={disabled || processing}
          size="lg"
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              보호 중...
            </>
          ) : (
            "이미지 보호 적용"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function OptionRow({
  checked,
  onToggle,
  icon,
  iconColor,
  title,
  desc,
  badge,
}: {
  checked: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <label className="flex items-start gap-4 rounded-2xl border bg-card p-4 cursor-pointer transition-colors hover:bg-accent/30 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconColor}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">{title}</div>
          {badge && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              {badge}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </label>
  );
}
