export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  start_weight: number | null;
  target_weight: number | null;
  height?: number | null;
  avatar_url?: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  penalty_rule?: string;
  created_by: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  streak_days: number;
  weekly_points: number;
  joined_at: string;
  profile?: UserProfile;
}

export interface DailyRecord {
  id: string;
  user_id: string;
  group_id: string;
  record_date: string; // YYYY-MM-DD
  weight: number | null;
  photo_url: string | null;
  workout_tags: string[] | null;
  workout_minutes: number | null;
  memo: string | null;
  points_earned: number;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

export interface PokeMessage {
  id: string;
  group_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  sender_profile?: UserProfile;
  receiver_profile?: UserProfile;
}

// 겹쳐보기에 사용할 사진 아이템
export interface BodyPhotoItem {
  id: string;
  record_date: string;
  photo_url: string;
  weight?: number | null;
  workout_tags?: string[] | null;
}
