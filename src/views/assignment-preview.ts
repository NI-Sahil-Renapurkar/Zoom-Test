import type { AssignmentPlan, AppState } from "../types.js";

export function renderAssignmentPreview(plan: AssignmentPlan, state: AppState): string {
  const roomBlocks = plan.rooms
    .map((room) => {
      const participants = room.participants
        .map(
          (p) => `
          <div class="participant-row">
            <div>
              <div class="participant-name">${escapeHtml(p.email)}</div>
              <div class="participant-meta">
                ${p.zoom_participant_id ? `Zoom ID: ${escapeHtml(p.zoom_participant_id)}` : "Not yet synced"}
              </div>
            </div>
          </div>`,
        )
        .join("");

      return `
        <div class="room-block">
          <div class="room-label">${escapeHtml(room.room_label)}</div>
          ${participants}
        </div>`;
    })
    .join("");

  const runButton = state.mockRunComplete
    ? `<div class="alert alert-info">Mock run complete — no breakout rooms were moved. Phase 3 will enable live assignment.</div>`
    : `<button class="btn btn-primary" id="mock-run-btn">Run Assignment (Preview Mode)</button>`;

  return `
    <div class="card">
      <div class="card-title">Assignment Plan — ${plan.rooms.length} room${plan.rooms.length !== 1 ? "s" : ""}</div>
      ${roomBlocks}
      ${plan.rooms.length === 0 ? '<div style="color:var(--color-muted);font-size:13px">No matches found for this round</div>' : ""}
    </div>
    ${runButton}`;
}

export function bindMockRunButton(onRun: () => void): void {
  const btn = document.getElementById("mock-run-btn");
  if (btn) {
    btn.addEventListener("click", onRun);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
