import { assignTask } from "../services/task_service.js";
import { bindCatalogTool } from "./tool_helpers.js";

export function buildTaskTools({ registries }) {
  return [
    bindCatalogTool(
      "task.assign",
      (args) => assignTask({ ...args, registries }),
    ),
  ];
}
