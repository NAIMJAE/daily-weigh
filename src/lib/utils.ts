import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 사용자 로컬 타임존(KST 등) 기준의 YYYY-MM-DD 날짜 문자열 반환
 * toISOString()은 UTC 기준이므로 자정 이후 9시간 동안 전날로 계산되는 문제를 방지합니다.
 */
export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(dateStr: string): string {
  // YYYY-MM-DD 형태 문자열을 로컬 Date 객체로 파싱
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  }

  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

/**
 * 주어진 날짜(YYYY-MM-DD)가 이번 주(월요일~일요일)에 속하는지 판별
 */
export function isDateInCurrentWeek(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return false;

  const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
  targetDate.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 이번 주 월요일 계산 (0: 일요일, 1: 월요일, ...)
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return targetDate >= monday && targetDate <= sunday;
}

/**
 * 사용자의 daily_records를 기반으로 실시간 주간 열정 포인트 계산
 */
export function calculateWeeklyPoints(
  records: { user_id: string; record_date: string; points_earned?: number }[],
  userId: string
): number {
  return records
    .filter((r) => r.user_id === userId && isDateInCurrentWeek(r.record_date))
    .reduce((sum, r) => sum + (Number(r.points_earned) || 0), 0);
}

/**
 * 사용자의 daily_records를 기반으로 실시간 연속 출석(스트릭) 계산
 */
export function calculateStreakDays(
  records: { user_id: string; record_date: string }[],
  userId: string
): number {
  const userDates = new Set(
    records
      .filter((r) => r.user_id === userId)
      .map((r) => r.record_date)
  );

  const now = new Date();
  let streak = 0;
  const checkDate = new Date(now);

  const todayStr = getTodayDateString(checkDate);
  if (!userDates.has(todayStr)) {
    // 오늘 아직 기록이 없다면 어제 기록부터 연속인지 검사
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (streak < 365) {
    const dStr = getTodayDateString(checkDate);
    if (userDates.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
