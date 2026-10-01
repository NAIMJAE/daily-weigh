// store.ts — 더미 데이터 없이 Supabase를 단일 진실의 원천으로 사용
// localStorage는 로그인한 유저 ID만 임시 캐싱용으로 사용합니다.
"use client";

const STORAGE_KEYS = {
  USER_ID: "dw_user_id",
};

export function getCachedUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.USER_ID);
}

export function setCachedUserId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(STORAGE_KEYS.USER_ID, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
  }
}

export function clearLocalCache() {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}
