"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (username.length < 3) {
      setErrorMsg("아이디는 최소 3글자 이상이어야 합니다.");
      return;
    }
    if (nickname.length < 2) {
      setErrorMsg("닉네임은 최소 2글자 이상이어야 합니다.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("비밀번호는 최소 6자리 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        setErrorMsg("Supabase가 설정되지 않았습니다. .env.local 파일을 확인해주세요.");
        return;
      }

      const supabase = createClient();
      if (!supabase) throw new Error("Supabase 클라이언트를 생성할 수 없습니다.");

      const cleanUsername = username.trim().toLowerCase();
      const virtualEmail = `${cleanUsername}@dailyweigh.local`;

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: virtualEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            nickname: nickname.trim(),
          },
        },
      });

      if (authErr) throw authErr;
      if (!authData.user) throw new Error("회원가입에 실패했습니다.");

      // profiles 테이블 저장
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: authData.user.id,
        username: cleanUsername,
        nickname: nickname.trim(),
        start_weight: startWeight ? parseFloat(startWeight) : null,
        target_weight: targetWeight ? parseFloat(targetWeight) : null,
      });

      if (profileErr) {
        console.warn("Profile save warning:", profileErr);
      }

      router.push(redirectPath);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message?.includes("already registered") || err.message?.includes("already been registered")
          ? "이미 사용 중인 아이디입니다."
          : err.message || "회원가입 중 오류가 발생했습니다."
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
        <h1 className="text-xl font-bold text-[#111111]">초간단 회원가입</h1>
        <p className="text-xs text-[#666666]">
          이메일 인증 없이 닉네임, 아이디, 비밀번호만으로 즉시 시작하세요.
        </p>
      </div>

      {/* Form */}
      <div className="p-6 bg-white border border-[#E5E5E5] rounded-[10px] shadow-2xs">
        <form onSubmit={handleRegister} className="space-y-3.5">
          <Input
            label="아이디 (Username)"
            placeholder="영문, 숫자 3자 이상"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />

          <Input
            label="닉네임"
            placeholder="그룹 내에서 불릴 이름"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />

          <Input
            label="비밀번호"
            type="password"
            placeholder="6자리 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <div className="pt-3 border-t border-[#E5E5E5]">
            <p className="text-[11px] text-[#999999] mb-2.5">
              선택 입력 — 나중에 변경 가능
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="시작 체중 (kg)"
                type="number"
                step="0.1"
                min="20"
                max="300"
                placeholder="예: 78.5"
                value={startWeight}
                onChange={(e) => setStartWeight(e.target.value)}
              />
              <Input
                label="목표 체중 (kg)"
                type="number"
                step="0.1"
                min="20"
                max="300"
                placeholder="예: 72.0"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-[6px] text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading || !username || !nickname || !password}
            className="w-full mt-2 gap-1.5"
          >
            {loading ? "가입 처리 중..." : "시작하기"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </div>

      {/* Login Link */}
      <div className="text-center text-xs text-[#666666]">
        이미 계정이 있으신가요?{" "}
        <Link
          href={`/auth/login${redirectPath !== "/" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
          className="text-[#FF4D00] font-semibold hover:underline"
        >
          로그인하기
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
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
        <RegisterForm />
      </Suspense>
    </div>
  );
}
