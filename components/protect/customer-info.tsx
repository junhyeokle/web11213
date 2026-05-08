"use client";
import { User, Lock, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomerInfo as CustomerInfoType } from "@/lib/types";

interface Props {
  customer: CustomerInfoType;
  onChange: (c: CustomerInfoType) => void;
}

export function CustomerInfoCard({ customer, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          고객 정보
        </CardTitle>
        <CardDescription>
          이름과 비밀번호로 본인을 식별합니다. 처음 사용하시면 자동으로 등록됩니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">고객명</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="예: 홍길동"
              value={customer.name}
              onChange={(e) => onChange({ ...customer, name: e.target.value })}
              className="pl-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">비밀번호</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={customer.password}
              onChange={(e) =>
                onChange({ ...customer, password: e.target.value })
              }
              className="pl-11"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-3 flex gap-2">
          <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            비밀번호는 안전하게 암호화되어 저장됩니다. 다음에 같은 이름으로
            업로드하실 때는 동일한 비밀번호를 사용해주세요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
