"use client";
import { motion } from "framer-motion";
import { Sparkles, Brain, ShieldOff } from "lucide-react";

export function AIProtectionSection() {
  return (
    <section className="container py-24 md:py-32">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-700 dark:text-violet-400 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI 시대의 새로운 방어선
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
            AI가 학습할 수 없는<br />
            <span className="text-gradient">이미지를 만드세요</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            AI 적대적 노이즈는 사람 눈에는 보이지 않지만,
            AI 모델이 이미지를 학습하거나 변형할 때
            완전히 다른 결과를 만들도록 유도합니다.
          </p>
          <ul className="space-y-4">
            {[
              {
                icon: Brain,
                t: "AI 학습 방해",
                d: "딥러닝 모델이 잘못된 특징을 학습하도록 유도",
              },
              {
                icon: ShieldOff,
                t: "변형 차단",
                d: "스타일 전이, 이미지 합성에서 깨진 결과 생성",
              },
              {
                icon: Sparkles,
                t: "원본 화질 보존",
                d: "사람 눈에는 거의 차이가 없는 미세 노이즈",
              },
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold mb-1">{item.t}</div>
                  <div className="text-sm text-muted-foreground">{item.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-pink-500/10 border p-8 overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-30" />
            <div className="relative grid grid-cols-2 gap-4 h-full">
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground">
                  원본 이미지
                </div>
                <div
                  className="aspect-square rounded-2xl bg-cover bg-center shadow-lg"
                  style={{
                    backgroundImage:
                      "url(https://picsum.photos/seed/orig/400/400)",
                  }}
                />
                <div className="rounded-xl bg-card border p-3 text-xs">
                  <div className="font-semibold text-emerald-600">
                    정상 학습 가능
                  </div>
                  <div className="text-muted-foreground mt-1">
                    AI가 특징을 정확히 추출
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-xs font-medium text-violet-600">
                  노이즈 적용
                </div>
                <div
                  className="relative aspect-square rounded-2xl bg-cover bg-center shadow-lg"
                  style={{
                    backgroundImage:
                      "url(https://picsum.photos/seed/orig/400/400)",
                  }}
                >
                  <div className="absolute inset-0 rounded-2xl bg-violet-500/20 mix-blend-overlay" />
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      backgroundImage:
                        "radial-gradient(rgba(139,92,246,0.3) 1px, transparent 1px)",
                      backgroundSize: "8px 8px",
                    }}
                  />
                </div>
                <div className="rounded-xl bg-card border p-3 text-xs">
                  <div className="font-semibold text-violet-600">학습 차단</div>
                  <div className="text-muted-foreground mt-1">
                    AI가 잘못된 특징을 학습
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
