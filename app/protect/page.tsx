"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Shield, AlertCircle } from "lucide-react";
import { UploadArea } from "@/components/protect/upload-area";
import { ProtectionOptionsCard } from "@/components/protect/protection-options";
import { ResultCard } from "@/components/protect/result-card";
import { CustomerInfoCard } from "@/components/protect/customer-info";
import {
  ProtectionOptions,
  ProtectionResult,
  CustomerInfo,
} from "@/lib/types";
import { processImageReal } from "@/lib/api";

export default function ProtectPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [customer, setCustomer] = React.useState<CustomerInfo>({
    name: "",
    password: "",
  });
  const [options, setOptions] = React.useState<ProtectionOptions>({
    applyAINoise: false,
    applyWatermark: true,
    generateFingerprint: true,
    strength: 50,
    metadata: "",
  });
  const [processing, setProcessing] = React.useState(false);
  const [result, setResult] = React.useState<ProtectionResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!file) return;
    if (!customer.name.trim() || !customer.password) {
      setError("고객명과 비밀번호를 입력해주세요");
      return;
    }
    setError(null);
    setProcessing(true);
    try {
      const res = await processImageReal(file, options, customer);
      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "이미지 보호 처리 실패";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const noOptionsSelected =
    !options.applyAINoise &&
    !options.applyWatermark &&
    !options.generateFingerprint;

  const customerInfoMissing = !customer.name.trim() || !customer.password;

  return (
    <div className="container py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
          <Shield className="h-3.5 w-3.5" />
          이미지 보호
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          이미지를 안전하게{" "}
          <span className="text-gradient">보호하세요</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          원하는 보호 기능을 선택하고 한 번의 클릭으로 완료하세요.
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <UploadArea
            file={file}
            previewUrl={previewUrl}
            onFile={handleFile}
            onClear={handleClear}
          />
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex gap-3"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <div className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1">
                  처리 실패
                </div>
                <p className="text-sm text-red-700/80 dark:text-red-400/80">
                  {error}
                </p>
              </div>
            </motion.div>
          )}
          {result && <ResultCard result={result} />}
        </div>
        <div className="lg:col-span-2 space-y-6">
          <CustomerInfoCard customer={customer} onChange={setCustomer} />
          <ProtectionOptionsCard
            options={options}
            onChange={setOptions}
            onProcess={handleProcess}
            processing={processing}
            disabled={!file || noOptionsSelected || customerInfoMissing}
          />
        </div>
      </div>
    </div>
  );
}
