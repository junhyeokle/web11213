import Link from "next/link";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-24">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-lg mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <Shield className="h-4 w-4" />
              </div>
              ImageGuard
            </div>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              AI 시대의 이미지 저작권을 보호하는 가장 스마트한 방법.
              비가시 워터마크, 이미지 지문, AI 적대적 노이즈를 통해
              당신의 창작물을 안전하게 지킵니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm">제품</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/protect" className="hover:text-foreground">
                  이미지 보호
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-foreground">
                  이미지 비교
                </Link>
              </li>
              <li>
                <Link href="/scan" className="hover:text-foreground">
                  사이트 검사
                </Link>
              </li>
              <li>
                <Link href="/monitor" className="hover:text-foreground">
                  자동 모니터링
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm">정보</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="hover:text-foreground">
                  소개
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t text-sm text-muted-foreground text-center">
          © 2026 ImageGuard. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
