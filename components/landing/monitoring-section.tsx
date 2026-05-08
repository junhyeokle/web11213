"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Bell, Calendar, Globe2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MonitoringSection() {
  return (
    <section className="bg-muted/30 py-24 md:py-32">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="rounded-3xl border bg-card shadow-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="font-semibold">모니터링 사이트</div>
                <span className="text-xs rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600 font-medium">
                  3개 활성
                </span>
              </div>
              <div className="space-y-3">
                {[
                  {
                    name: "네이버 블로그",
                    url: "blog.naver.com/yourname",
                    freq: "매일",
                    count: 2,
                  },
                  {
                    name: "포트폴리오",
                    url: "my-portfolio.com",
                    freq: "매주",
                    count: 0,
                  },
                  {
                    name: "Instagram",
                    url: "instagram.com/yourname",
                    freq: "매일",
                    count: 1,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border bg-background p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                      <Globe2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {s.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.url}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{s.freq}</div>
                      {s.count > 0 && (
                        <div className="text-xs font-semibold text-amber-600 mt-0.5">
                          {s.count}건 발견
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 mb-6">
              <Bell className="h-3.5 w-3.5" />
              24/7 자동 감시
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
              잠든 사이에도<br />
              <span className="text-gradient">당신의 권리를 지킵니다</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              여러 사이트를 한꺼번에 등록하고 주기를 설정하면,
              자동으로 검사하고 도용이 발견되는 즉시 알림을 보내드립니다.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: Calendar, t: "유연한 주기", d: "매일 / 매주 / 매월" },
                { icon: Zap, t: "즉각 알림", d: "발견 즉시 푸시" },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border bg-card p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-3">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="font-semibold text-sm mb-1">{item.t}</div>
                  <div className="text-xs text-muted-foreground">{item.d}</div>
                </div>
              ))}
            </div>
            <Button asChild size="lg">
              <Link href="/monitor">모니터링 시작하기</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
