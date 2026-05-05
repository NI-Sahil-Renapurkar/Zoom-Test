import type {
  AssignmentPlan,
  AuthResponse,
  EventContext,
  ParticipantSyncResult,
  ZoomParticipantInput,
} from "./types.js";

const BASE_URL = import.meta.env.VITE_HOOGAH_API_BASE_URL ?? "https://api.hoogah.com";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function debugLog(label: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/virtual-events/debug-log/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, data }),
    });
  } catch {
    // ignore — debug logger never blocks
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ApiError(response.status, `HTTP ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function devAuth(email: string, eventId?: number): Promise<AuthResponse> {
  return request<AuthResponse>("/api/virtual-events/zoom/dev-auth/", {
    method: "POST",
    body: JSON.stringify({ email, event_id: eventId }),
  });
}

export async function exchangeContextToken(
  contextToken: string,
  oauthCode: string,
  codeVerifier: string,
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/virtual-events/zoom/auth/", {
    method: "POST",
    body: JSON.stringify({
      context_token: contextToken,
      oauth_code: oauthCode,
      code_verifier: codeVerifier,
    }),
  });
}

export async function fetchEventContext(
  token: string,
  meetingUuid: string,
  eventId?: number | null,
): Promise<EventContext> {
  const params = eventId
    ? `event_id=${eventId}`
    : `meeting_uuid=${encodeURIComponent(meetingUuid)}`;
  return request<EventContext>(`/api/virtual-events/zoom/context/?${params}`, { token });
}

export async function syncParticipants(
  token: string,
  eventId: number,
  participants: ZoomParticipantInput[],
): Promise<ParticipantSyncResult> {
  return request<ParticipantSyncResult>(
    `/api/virtual-events/${eventId}/zoom/participants/sync/`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ participants }),
    },
  );
}

export async function fetchAssignmentPlan(
  token: string,
  eventId: number,
  roundId: number,
): Promise<AssignmentPlan> {
  return request<AssignmentPlan>(
    `/api/virtual-events/${eventId}/rounds/${roundId}/zoom-assignment-plan/`,
    { token },
  );
}
