import type { ParticipantSyncResult } from "../types.js";

export function renderParticipantList(syncResult: ParticipantSyncResult): string {
  const { matched, unmatched } = syncResult;

  const matchedRows = matched
    .map(
      (p) => `
      <div class="participant-row">
        <div>
          <div class="participant-name">${escapeHtml(p.email)}</div>
          <div class="participant-meta">ID: ${escapeHtml(p.zoom_participant_id)}</div>
        </div>
        <span class="match-badge">Matched</span>
      </div>`,
    )
    .join("");

  const unmatchedRows = unmatched
    .map(
      (p) => `
      <div class="participant-row">
        <div>
          <div class="participant-name">${escapeHtml(p.display_name)}</div>
          <div class="participant-meta">${escapeHtml(p.email)}</div>
        </div>
        <span class="match-badge unmatched">Unmatched</span>
      </div>`,
    )
    .join("");

  return `
    <div class="card">
      <div class="card-title">Participants (${matched.length + unmatched.length})</div>
      ${matchedRows}
      ${unmatchedRows}
      ${matched.length === 0 && unmatched.length === 0 ? '<div style="color:var(--color-muted);font-size:13px">No participants found</div>' : ""}
    </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
