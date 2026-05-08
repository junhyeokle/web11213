"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="container py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-12 md:p-20 text-center text-white"
      >
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            지금 바로<br />당신의 창작물을 보호하세요
          </h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-10">
            클릭 한 번으로 시작하는 가장 스마트한 저작권 보호.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-blue-600 hover:bg-white/90 shadow-2xl"
          >
            <Link href="/protect">
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
