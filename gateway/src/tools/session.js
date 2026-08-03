import { append as auditAppend } from "../core/audit.js";
import * as sessionRepo from "../core/repositories/session_repo.js";
import { bindCatalogTool } from "./tool_helpers.js";

export function buildSessionTools() {
  return [
    bindCatalogTool(
      "session.attach_info",
      async ({ sessionId }) => {
        const row = sessionRepo.getSessionById(sessionId);
        if (!row) return { error: "NOT_FOUND" };
        if (!row.tmux_target) return { error: "NOT_SUPERVISED" };
        return {
          sessionId,
          tmuxTarget: row.tmux_target,
          attachCommand: `tmux attach -t ${row.tmux_target}`,
        };
      },
    ),
    bindCatalogTool(
      "session.intervention_note",
      async ({ sessionId, traceId, note, by }) => {
        auditAppend({
          type: "HUMAN_TMUX_INTERVENTION_NOTE",
          sessionId,
          traceId,
          by: by || "operator",
          note: note.slice(0, 4000),
        });
        return { ok: true };
      },
    ),
  ];
}
