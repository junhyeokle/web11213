"use client";
import { motion } from "framer-motion";
import { Upload, Shield, Search, Bell } from "lucide-react";

const steps = [
  { icon: Upload, title: "이미지 업로드", desc: "보호하고 싶은 이미지를 업로드합니다." },
  { icon: Shield, title: "보호 적용", desc: "워터마크, 지문, AI 노이즈를 선택해 적용합니다." },
  { icon: Search, title: "사이트 검사", desc: "의심되는 사이트 URL을 입력해 도용 여부를 확인합니다." },
  { icon: Bell, title: "자동 모니터링", desc: "등록한 사이트를 정기적으로 자동 감시합니다." },
];

export function HowItWorks() {
  return (
    <section className="bg-muted/30 py-24 md:py-32">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-gradient">4단계</span>로 끝나는 보호 절차
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            복잡한 설정 없이, 클릭 몇 번으로 저작권 보호를 시작하세요.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 relative">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative text-center"
            >
              <div className="relative inline-flex">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/20">
                  <step.icon className="h-8 w-8" />
                </div>
                <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary text-primary text-sm font-bold">
                  {i + 1}
                </div>
              </div>
              <h3 className="text-xl font-semibold mt-6 mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
