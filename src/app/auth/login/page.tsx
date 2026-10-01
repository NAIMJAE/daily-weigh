"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/context/app-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const { refreshAuth } = useApp();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        setErrorMsg("Supabase가 설정되지 않았습니다. Netlify 환경 변수를 확인해주세요.");
        return;
      }

      const supabase = createClient();
      if (!supabase) throw new Error("Supabase 클라이언트를 생성할 수 없습니다.");

      const virtualEmail = `${username.trim().toLowerCase()}@dailyweigh.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password,
      });

      if (error) throw error;
      
      // 전역 상태 갱신 후 리다이렉트
      await refreshAuth();
      window.location.href = redirectPath;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message?.includes("Invalid login credentials")
          ? "아이디 또는 비밀번호가 올바르지 않습니다."
          : err.message || "로그인에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Brand */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-full bg-[#FF4D00] shrink-0" />
          <span className="font-extrabold text-xl text-[#111111] tracking-tight">
            매일재라
          </span>
          <span className="text-xs text-[#999999] font-medium">Daily Weigh</span>
        </div>
        <h1 className="text-xl font-bold text-[#111111]">로그인</h1>
        <p className="text-xs text-[#666666]">
          아이디와 비밀번호만 입력하면 즉시 접속됩니다.
        </p>
      </div>

      {/* Form */}
      <div className="p-6 bg-white border border-[#E5E5E5] rounded-[10px] space-y-4 shadow-2xs">
        <form onSubmit={handleLogin} className="space-y-3.5">
          <Input
            label="아이디 (Username)"
            placeholder="아이디를 입력하세요"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />

          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-[6px] text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading || !username || !password}
            className="w-full mt-2 gap-1.5"
          >
            {loading ? "접속 중..." : "로그인하기"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </div>

      {/* Register Link */}
      <div className="text-center text-xs text-[#666666]">
        계정이 없으신가요?{" "}
        <Link
          href={`/auth/register${redirectPath !== "/" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
          className="text-[#FF4D00] font-semibold hover:underline"
        >
          5초 만에 초간단 회원가입
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center items-center p-4">
      <Suspense
        fallback={
          <div className="text-xs text-[#999999] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-pulse" />
            로딩 중...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
