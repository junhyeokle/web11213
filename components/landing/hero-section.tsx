"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingDashboard } from "./floating-dashboard";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-40">
      <div className="absolute inset-0 bg-grid opacity-[0.03] dark:opacity-[0.05]" />
      <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 backdrop-blur px-4 py-1.5 text-sm font-medium mb-8">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            AI 시대의 새로운 저작권 보호 솔루션
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            창작물을<br />
            <span className="text-gradient">AI로부터 지키세요</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            비가시 워터마크와 이미지 지문, AI 적대적 노이즈로
            <br className="hidden md:inline" />
            창작자의 권리를 자동으로 모니터링하고 지켜드립니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-16">
            <Button asChild size="lg">
              <Link href="/protect">
                지금 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#features">기능 살펴보기</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <FloatingDashboard />
        </motion.div>
      </div>
    </section>
  );
}
