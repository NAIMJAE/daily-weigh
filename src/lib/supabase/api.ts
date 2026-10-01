// lib/supabase/api.ts — Supabase 기반 데이터 접근 레이어
import { createClient } from "./client";
import { DailyRecord, Group, GroupMember, PokeMessage, UserProfile } from "@/types";

// ─────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────

/** 현재 로그인된 Supabase Auth 세션 유저 */
export async function getSessionUser() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

// ─────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) { console.error("fetchProfile:", error); return null; }
  return data as UserProfile;
}

// ─────────────────────────────────────────────────────────
// Groups
// ─────────────────────────────────────────────────────────

/** 해당 유저가 속한 그룹 목록 (group_members join groups) */
export async function fetchUserGroups(userId: string): Promise<Group[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("group_members")
    .select("groups(*)")
    .eq("user_id", userId);
  if (error) { console.error("fetchUserGroups:", error); return []; }
  // data: [{ groups: Group }]
  return (data ?? [])
    .map((row: any) => row.groups)
    .filter(Boolean) as Group[];
}

/** 초대 코드로 그룹 조회 */
export async function fetchGroupByInviteCode(code: string): Promise<Group | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("invite_code", code)
    .single();
  if (error) { console.error("fetchGroupByInviteCode:", error); return null; }
  return data as Group;
}

/** 새 그룹 생성 */
export async function createGroup(
  userId: string,
  name: string,
  penaltyRule?: string
): Promise<Group | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const inviteCode = `DW-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const { data, error } = await supabase
    .from("groups")
    .insert({
      name,
      invite_code: inviteCode,
      penalty_rule: penaltyRule || null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) { console.error("createGroup:", error); return null; }
  return data as Group;
}

// ─────────────────────────────────────────────────────────
// Group Members
// ─────────────────────────────────────────────────────────

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("group_members")
    .select("*, profile:profiles(*)")
    .eq("group_id", groupId);
  if (error) { console.error("fetchGroupMembers:", error); return []; }
  return (data ?? []).map((row: any) => ({
    ...row,
    profile: row.profile,
  })) as GroupMember[];
}

/** 그룹 가입 */
export async function joinGroup(
  userId: string,
  groupId: string
): Promise<GroupMember | null> {
  const supabase = createClient();
  if (!supabase) return null;
  // 이미 멤버인지 확인
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .single();
  if (existing) return existing as GroupMember;

  const { data, error } = await supabase
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: userId,
      role: "member",
      streak_days: 0,
      weekly_points: 0,
    })
    .select()
    .single();
  if (error) { console.error("joinGroup:", error); return null; }
  return data as GroupMember;
}

/** 그룹 생성자를 owner로 group_members에 추가 */
export async function addOwnerToGroup(
  userId: string,
  groupId: string
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("group_members").upsert({
    group_id: groupId,
    user_id: userId,
    role: "owner",
    streak_days: 0,
    weekly_points: 0,
  });
}

// ─────────────────────────────────────────────────────────
// Daily Records
// ─────────────────────────────────────────────────────────

export async function fetchGroupRecords(groupId: string): Promise<DailyRecord[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("daily_records")
    .select("*, profile:profiles(*)")
    .eq("group_id", groupId)
    .order("record_date", { ascending: false });
  if (error) { console.error("fetchGroupRecords:", error); return []; }
  return (data ?? []) as DailyRecord[];
}

export async function upsertDailyRecord(
  record: Omit<DailyRecord, "id" | "created_at" | "updated_at" | "profile">
): Promise<DailyRecord | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("daily_records")
    .upsert(
      {
        ...record,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,record_date,group_id" }
    )
    .select()
    .single();
  if (error) { console.error("upsertDailyRecord:", error); return null; }
  return data as DailyRecord;
}

/** 멤버 포인트/스트릭 업데이트 */
export async function updateMemberStats(
  userId: string,
  groupId: string,
  delta: { streak_days?: number; weekly_points?: number }
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  // RPC 또는 increment 없이 현재 값 먼저 읽고 업데이트
  const { data: current } = await supabase
    .from("group_members")
    .select("streak_days, weekly_points")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .single();
  if (!current) return;
  await supabase
    .from("group_members")
    .update({
      streak_days: (current.streak_days ?? 0) + (delta.streak_days ?? 0),
      weekly_points: (current.weekly_points ?? 0) + (delta.weekly_points ?? 0),
    })
    .eq("user_id", userId)
    .eq("group_id", groupId);
}

// ─────────────────────────────────────────────────────────
// Poke Messages
// ─────────────────────────────────────────────────────────

export async function fetchGroupPokes(groupId: string): Promise<PokeMessage[]> {
  const supabase = createClient();
  if (!supabase) return [];
  // plain select 먼저 시도 (join alias가 실패하면 fallback 불필요)
  const { data, error } = await supabase
    .from("pokes")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) { console.error("fetchGroupPokes:", error); return []; }
  // sender/receiver 프로필을 별도로 로드 (RLS 문제 회피용)
  const pokes = (data ?? []) as PokeMessage[];
  if (pokes.length === 0) return pokes;

  const userIds = [...new Set(pokes.flatMap((p) => [p.sender_id, p.receiver_id]))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

  return pokes.map((p) => ({
    ...p,
    sender_profile: profileMap[p.sender_id],
    receiver_profile: profileMap[p.receiver_id],
  }));
}

export async function sendPoke(
  groupId: string,
  senderId: string,
  receiverId: string,
  message: string
): Promise<PokeMessage | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("pokes")
    .insert({ group_id: groupId, sender_id: senderId, receiver_id: receiverId, message })
    .select()
    .single();
  if (error) { console.error("sendPoke:", error); return null; }
  return data as PokeMessage;
}

// ─────────────────────────────────────────────────────────
// Image Upload
// ─────────────────────────────────────────────────────────

export async function uploadBodyPhoto(
  userId: string,
  file: File
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const ext = file.name.split(".").pop() ?? "webp";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("body-photos")
    .upload(path, file, { upsert: true });
  if (error) { console.error("uploadBodyPhoto:", error); return null; }
  const { data } = supabase.storage.from("body-photos").getPublicUrl(path);
  return data.publicUrl;
}
