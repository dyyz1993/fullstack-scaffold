import type { ResolvedPreset } from "./template-generator";

export function generateClientComponentsIndex(
  resolved: ResolvedPreset,
): string {
  const lines: string[] = [];

  lines.push(`export { StatusBadge, type ColorScheme } from './StatusBadge'`);
  lines.push(`export { LoadingSpinner } from './LoadingSpinner'`);
  lines.push(`export { EmptyState } from './EmptyState'`);

  if (resolved.modules.has("chat") || resolved.modules.has("notifications")) {
    lines.push(`export { ConnectionStatus } from './ConnectionStatus'`);
  }

  if (resolved.modules.has("chat")) {
    lines.push(`export { MessageCard } from './MessageCard'`);
  }

  if (resolved.hasAdmin) {
    lines.push(`export { AuthButton } from './AuthButton'`);
  }

  return lines.join("\n") + "\n";
}
