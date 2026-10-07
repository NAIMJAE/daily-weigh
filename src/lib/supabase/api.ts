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
    .maybeSingle();

  if (error) {
    console.error("fetchProfile error:", error);
  }

  if (data) {
    return data as UserProfile;
  }

  // 프로필 레코드가 누락된 경우 auth 유저 정보로부터 자동 복구 생성 시도
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user;
  if (authUser && authUser.id === userId) {
    const rawUsername =
      authUser.user_metadata?.username ||
      authUser.email?.split("@")[0] ||
      `user_${userId.slice(0, 5)}`;
    const rawNickname =
      authUser.user_metadata?.nickname ||
      rawUsername;

    const fallbackProfile: Partial<UserProfile> = {
      id: userId,
      username: rawUsername,
      nickname: rawNickname,
      created_at: new Date().toISOString(),
    };

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .upsert(fallbackProfile)
      .select()
      .maybeSingle();

    if (!insertError && created) {
      return created as UserProfile;
    }

    return fallbackProfile as UserProfile;
  }

  return null;
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

/**
 * 그룹 멤버 강퇴 (방장 전용)
 * @param groupId 그룹 ID
 * @param targetUserId 강퇴 대상 사용자 ID
 * @param keepRecords 기록 보존 여부 (true: 체중/사진 기록 유지, false: 기록 완전 삭제)
 */
export async function kickMemberFromGroup(
  groupId: string,
  targetUserId: string,
  keepRecords: boolean = true
): Promise<{ success: boolean; error?: any }> {
  const supabase = createClient();
  if (!supabase) return { success: false, error: new Error("Supabase not configured") };

  try {
    // 1. 기록 삭제 선택 시 해당 그룹의 데일리 기록 및 찌르기 메시지 삭제
    if (!keepRecords) {
      await supabase
        .from("daily_records")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", targetUserId);

      await supabase
        .from("pokes")
        .delete()
        .eq("group_id", groupId)
        .or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`);
    }

    // 2. 그룹 멤버십 제거
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", targetUserId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("kickMemberFromGroup error:", err);
    return { success: false, error: err };
  }
}

/**
 * 그룹 자진 퇴장 (본인 전용)
 * @param groupId 그룹 ID
 * @param userId 사용자 ID
 * @param keepRecords 기록 보존 여부
 */
export async function leaveGroupMember(
  groupId: string,
  userId: string,
  keepRecords: boolean = true
): Promise<{ success: boolean; error?: any }> {
  const supabase = createClient();
  if (!supabase) return { success: false, error: new Error("Supabase not configured") };

  try {
    // 1. 현재 멤버 정보 확인 (방장 여부 및 다른 멤버 존재 여부)
    const { data: currentMember } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    // 2. 기록 삭제 선택 시 데이터 삭제
    if (!keepRecords) {
      await supabase
        .from("daily_records")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      await supabase
        .from("pokes")
        .delete()
        .eq("group_id", groupId)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    }

    // 3. 멤버십 제거
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) throw error;

    // 4. 만약 방장이었고 다른 멤버가 남아있다면, 다음 멤버에게 방장 권한 자동 위임
    if (currentMember?.role === "owner") {
      const { data: remainingMembers } = await supabase
        .from("group_members")
        .select("id, user_id")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true })
        .limit(1);

      if (remainingMembers && remainingMembers.length > 0) {
        await supabase
          .from("group_members")
          .update({ role: "owner" })
          .eq("id", remainingMembers[0].id);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("leaveGroupMember error:", err);
    return { success: false, error: err };
  }
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
): Promise<{ data: DailyRecord | null; error: any }> {
  const supabase = createClient();
  if (!supabase) return { data: null, error: new Error("Supabase client not initialized") };
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
  if (error) {
    console.error("upsertDailyRecord error:", error);
    return { data: null, error };
  }
  return { data: data as DailyRecord, error: null };
}

/**
 * 특정 그룹의 내 전체 기록을 선택한 다른 그룹들로 일괄 동기화 (복사/동기화)
 */
export async function syncUserRecordsToTargetGroups(
  userId: string,
  sourceGroupId: string,
  targetGroupIds: string[]
): Promise<{ success: boolean; syncedCount: number; error?: any }> {
  const supabase = createClient();
  if (!supabase) return { success: false, syncedCount: 0, error: new Error("Supabase client not initialized") };

  if (!targetGroupIds || targetGroupIds.length === 0) {
    return { success: true, syncedCount: 0 };
  }

  try {
    // 1. 소스 그룹의 내 모든 기록 가져오기
    const { data: sourceRecords, error: fetchErr } = await supabase
      .from("daily_records")
      .select("*")
      .eq("user_id", userId)
      .eq("group_id", sourceGroupId);

    if (fetchErr) throw fetchErr;
    if (!sourceRecords || sourceRecords.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    // 2. 각 대상 그룹별로 레코드 생성
    let totalSynced = 0;
    for (const targetGroupId of targetGroupIds) {
      if (targetGroupId === sourceGroupId) continue;

      const payload = sourceRecords.map((r: any) => ({
        user_id: userId,
        group_id: targetGroupId,
        record_date: r.record_date,
        weight: r.weight,
        photo_url: r.photo_url,
        workout_tags: r.workout_tags,
        workout_minutes: r.workout_minutes,
        memo: r.memo,
        points_earned: r.points_earned ?? 20,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from("daily_records")
        .upsert(payload, { onConflict: "user_id,record_date,group_id" });

      if (upsertErr) {
        console.error(`sync to group ${targetGroupId} failed:`, upsertErr);
      } else {
        totalSynced += payload.length;
      }
    }

    return { success: true, syncedCount: totalSynced };
  } catch (err: any) {
    console.error("syncUserRecordsToTargetGroups error:", err);
    return { success: false, syncedCount: 0, error: err };
  }
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
    .limit(200);
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
  message: string,
  recordId?: string
): Promise<PokeMessage | null> {
  const supabase = createClient();
  if (!supabase) return null;

  // 피드 개별 게시글 댓글인 경우 [post:RECORD_ID] 메타데이터를 결합하여 다른 피드와 격리
  const formattedMessage = recordId ? `[post:${recordId}] ${message}` : message;

  const payload: any = {
    group_id: groupId,
    sender_id: senderId,
    receiver_id: receiverId,
    message: formattedMessage,
  };

  const { data, error } = await supabase
    .from("pokes")
    .insert(payload)
    .select()
    .single();

  if (error) { console.error("sendPoke:", error); return null; }
  return data as PokeMessage;
}

export async function deletePoke(pokeId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase.from("pokes").delete().eq("id", pokeId);
  if (error) {
    console.error("deletePoke error:", error);
    return false;
  }
  return true;
}

export async function updateProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("updateProfile error:", error);
    return null;
  }
  return data as UserProfile;
}

// ─────────────────────────────────────────────────────────
// Image Upload
// ─────────────────────────────────────────────────────────

export async function uploadBodyPhoto(
  userId: string,
  file: File | Blob,
  mimeType = "image/webp"
): Promise<{ url: string | null; error: any }> {
  const supabase = createClient();
  if (!supabase) return { url: null, error: new Error("Supabase client not initialized") };
  
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "webp";
  const path = `${userId}/${Date.now()}.${ext}`;
  
  const { error } = await supabase.storage
    .from("body-photos")
    .upload(path, file, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("uploadBodyPhoto storage error:", error);
    return { url: null, error };
  }

  const { data } = supabase.storage.from("body-photos").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function uploadAvatarPhoto(
  userId: string,
  file: File | Blob,
  mimeType = "image/webp"
): Promise<{ url: string | null; error: any }> {
  const supabase = createClient();
  if (!supabase) return { url: null, error: new Error("Supabase client not initialized") };

  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "webp";
  const path = `avatars/${userId}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("body-photos")
    .upload(path, file, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("uploadAvatarPhoto storage error:", error);
    return { url: null, error };
  }

  const { data } = supabase.storage.from("body-photos").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
