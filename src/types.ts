export interface AuthResponse {
  token: string;
  expires_at: string;
  event_id: number | null;
}

export interface Round {
  id: number;
  name: string;
  order: number;
  type: string;
  completed_at: string | null;
}

export interface EventContext {
  event_id: number;
  event_name: string;
  provider_config_id: number;
  zoom_meeting_id: string;
  rounds: Round[];
}

export interface ZoomParticipantInput {
  participant_id: string;
  participant_uuid?: string;
  display_name: string;
  email: string;
}

export interface MatchedParticipant {
  user_id: number;
  email: string;
  zoom_participant_id: string;
}

export interface UnmatchedParticipant {
  zoom_participant_id: string;
  display_name: string;
  email: string;
}

export interface ParticipantSyncResult {
  matched: MatchedParticipant[];
  unmatched: UnmatchedParticipant[];
}

export interface RoomParticipant {
  user_id: number;
  email: string;
  zoom_participant_id: string | null;
}

export interface Room {
  room_label: string;
  participants: RoomParticipant[];
}

export interface AssignmentPlan {
  event_id: number;
  round_id: number;
  assignment_run_id: number;
  idempotency_key: string;
  rooms: Room[];
}

export interface AppState {
  hoogahToken: string | null;
  eventId: number | null;
  eventContext: EventContext | null;
  syncResult: ParticipantSyncResult | null;
  plan: AssignmentPlan | null;
  selectedRoundId: number | null;
  mockRunComplete: boolean;
}
