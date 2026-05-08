"use client";
import { motion } from "framer-motion";
import { Eye, Fingerprint, Sparkles, Search, Bell } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "비가시 워터마크",
    description:
      "사람 눈에는 보이지 않지만 추적 가능한 식별자를 이미지에 삽입합니다. JPEG 압축, 리사이즈에도 살아남습니다.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Fingerprint,
    title: "이미지 지문",
    description:
      "이미지의 고유한 시각적 특징을 64비트 해시로 변환. 변형된 이미지도 원본과 매칭할 수 있습니다.",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: Sparkles,
    title: "AI 적대적 노이즈",
    description:
      "AI 모델이 학습하거나 변형할 때 다른 결과를 만들도록 유도하는 미세 노이즈를 삽입합니다.",
    color: "from-violet-500 to-pink-500",
    badge: "곧 출시",
  },
  {
    icon: Search,
    title: "사이트 검사",
    description:
      "특정 URL을 입력하면 해당 페이지에 본인의 저작권 이미지가 사용되었는지 자동으로 확인합니다.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Bell,
    title: "자동 모니터링",
    description:
      "등록한 사이트들을 주기적으로 자동 검사하고, 도용이 발견되면 즉시 알림으로 알려드립니다.",
    color: "from-amber-500 to-orange-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="container py-24 md:py-32">
      <div className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
        >
          창작자에게 필요한
          <br className="md:hidden" /> <span className="text-gradient">모든 도구</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          삽입부터 추적까지, 저작권 보호의 전 과정을 한곳에서 처리하세요.
        </motion.p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group relative rounded-3xl border bg-card p-7 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-4 shadow-lg`}
            >
              <feature.icon className="h-5 w-5" />
            </div>
            {feature.badge && (
              <span className="absolute top-7 right-7 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                {feature.badge}
              </span>
            )}
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
