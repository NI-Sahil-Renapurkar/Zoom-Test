import zoomSdk from "@zoom/appssdk";
import type { AppState } from "./types.js";
import {
  exchangeContextToken,
  fetchAssignmentPlan,
  fetchEventContext,
  syncParticipants,
  ApiError,
} from "./api.js";
import { renderParticipantList } from "./views/participant-list.js";
import { renderAssignmentPreview, bindMockRunButton } from "./views/assignment-preview.js";

const state: AppState = {
  hoogahToken: null,
  eventId: null,
  eventContext: null,
  syncResult: null,
  plan: null,
  selectedRoundId: null,
  mockRunComplete: false,
};

function mount(html: string): void {
  const app = document.getElementById("app");
  if (app) app.innerHTML = html;
}

function renderError(message: string): void {
  mount(`
    <div class="header">
      <h1>Hoogah</h1>
    </div>
    <div class="alert alert-error">${escapeHtml(message)}</div>`);
}

function renderLoading(message: string): void {
  mount(`
    <div class="loading">
      <div class="spinner"></div>
      <div>${escapeHtml(message)}</div>
    </div>`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRoundSelector(): void {
  const { eventContext } = state;
  if (!eventContext) return;

  const rounds = eventContext.rounds.filter((r) => r.type === "breakout");
  if (rounds.length === 0) {
    mount(`
      <div class="header">
        <h1>Hoogah</h1>
        <span class="status-badge">${escapeHtml(eventContext.event_name)}</span>
      </div>
      <div class="alert alert-info">No breakout rounds configured for this event.</div>`);
    return;
  }

  const options = rounds
    .map((r) => `<option value="${r.id}">${escapeHtml(r.name)}</option>`)
    .join("");

  mount(`
    <div class="header">
      <h1>Hoogah</h1>
      <span class="status-badge">${escapeHtml(eventContext.event_name)}</span>
    </div>
    <div class="card">
      <div class="card-title">Select Round</div>
      <select id="round-select" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px">
        ${options}
      </select>
      <button class="btn btn-primary" id="load-round-btn" style="margin-top:12px">Load Assignment Plan</button>
    </div>`);

  document.getElementById("load-round-btn")?.addEventListener("click", async () => {
    const select = document.getElementById("round-select") as HTMLSelectElement;
    state.selectedRoundId = parseInt(select.value, 10);
    await loadAssignmentPlan();
  });
}

async function loadAssignmentPlan(): Promise<void> {
  const { hoogahToken, eventId, selectedRoundId } = state;
  if (!hoogahToken || !eventId || !selectedRoundId) return;

  renderLoading("Loading assignment plan…");
  try {
    state.plan = await fetchAssignmentPlan(hoogahToken, eventId, selectedRoundId);
    state.mockRunComplete = false;
    renderDashboard();
  } catch (err) {
    const msg = err instanceof ApiError ? `API error ${err.status}` : "Failed to load assignment plan";
    renderError(msg);
  }
}

function renderDashboard(): void {
  const { eventContext, syncResult, plan } = state;
  if (!eventContext) return;

  const participantSection = syncResult ? renderParticipantList(syncResult) : "";
  const assignmentSection = plan ? renderAssignmentPreview(plan, state) : "";

  mount(`
    <div class="header">
      <h1>Hoogah</h1>
      <span class="status-badge">${escapeHtml(eventContext.event_name)}</span>
    </div>
    ${participantSection}
    ${assignmentSection}
    <button class="btn btn-primary" id="back-btn" style="background:#64748b;margin-top:8px">Back to Round Selection</button>`);

  if (plan) {
    bindMockRunButton(handleMockRun);
  }

  document.getElementById("back-btn")?.addEventListener("click", () => {
    state.plan = null;
    state.selectedRoundId = null;
    renderRoundSelector();
  });
}

async function handleMockRun(): Promise<void> {
  state.mockRunComplete = true;
  renderDashboard();
}

async function init(): Promise<void> {
  renderLoading("Initializing Hoogah…");

  try {
    const configResponse = await zoomSdk.config({
      capabilities: [
        "getAppContext",
        "getMeetingParticipants",
        "getRunningContext",
        "promptAuthorize",
        "authorize",
      ],
      popoutSize: { width: 480, height: 720 },
      version: "0.16",
    });

    if (!configResponse) {
      renderError("Zoom SDK config failed — no response");
      return;
    }
  } catch (err) {
    renderError("Failed to initialize Zoom SDK. Run this app inside a Zoom meeting.");
    return;
  }

  renderLoading("Authenticating…");

  let contextToken: string;
  try {
    const appContext = await zoomSdk.getAppContext();
    contextToken = appContext.context;
  } catch (err) {
    renderError("Could not retrieve Zoom app context. Ensure the app is launched from within a meeting.");
    return;
  }

  let oauthCode: string;
  try {
    const authz = await zoomSdk.promptAuthorize();
    console.log("promptAuthorize response:", authz);
    oauthCode = (authz as unknown as { code?: string }).code ?? "";
    if (!oauthCode) {
      renderError(`promptAuthorize returned no code. Response: ${JSON.stringify(authz)}`);
      return;
    }
  } catch (err) {
    console.error("promptAuthorize threw:", err);
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err);
    renderError(`OAuth prompt failed — ${detail}`);
    return;
  }

  try {
    const auth = await exchangeContextToken(contextToken, oauthCode);
    state.hoogahToken = auth.token;
    state.eventId = auth.event_id;
  } catch (err) {
    const msg = err instanceof ApiError ? `Authentication failed (${err.status})` : "Authentication failed";
    renderError(msg);
    return;
  }

  if (!state.eventId) {
    renderError("This Zoom meeting is not linked to a Hoogah event.");
    return;
  }

  renderLoading("Loading event…");

  let meetingUuid: string;
  try {
    const runningContext = await zoomSdk.getRunningContext();
    meetingUuid = (runningContext as { meetingUUID?: string }).meetingUUID ?? "";
  } catch {
    meetingUuid = "";
  }

  try {
    state.eventContext = await fetchEventContext(state.hoogahToken!, meetingUuid);
  } catch (err) {
    const msg = err instanceof ApiError ? `Failed to load event (${err.status})` : "Failed to load event";
    renderError(msg);
    return;
  }

  renderLoading("Syncing participants…");

  try {
    const participantsResult = await zoomSdk.getMeetingParticipants();
    const zoomParticipants = (participantsResult.participants ?? []).map((p) => ({
      participant_id: p.participantId,
      participant_uuid: p.participantUUID,
      display_name: p.screenName,
      email: "",
    }));
    state.syncResult = await syncParticipants(state.hoogahToken!, state.eventId!, zoomParticipants);
  } catch (err) {
    // Non-fatal: proceed without sync result
    console.warn("Participant sync failed:", err);
  }

  renderRoundSelector();
}

init().catch((err) => {
  console.error("Unhandled init error:", err);
  renderError("Unexpected error. Please close and reopen the app.");
});
