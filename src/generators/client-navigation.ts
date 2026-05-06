/**
 * Generates client/components/Navigation.tsx content based on resolved preset
 */
import type { ResolvedPreset } from "./template-generator";
import { getClientPages } from "./template-generator";

const ICON_MAP: Record<string, string> = {
  TodoPage: "CheckCircle",
  NotificationPage: "Bell",
  WebSocketPage: "Plug",
};

export function generateClientNavigation(resolved: ResolvedPreset): string {
  const pages = getClientPages(resolved);

  // Collect unique icons needed
  const iconsNeeded = new Set<string>();
  iconsNeeded.add("Rocket");
  iconsNeeded.add("Github");
  for (const page of pages) {
    const icon = ICON_MAP[page.name];
    if (icon) iconsNeeded.add(icon);
  }

  // Build route keys and route objects
  const routeKeys: string[] = [];
  const routeEntries: string[] = [];

  for (const page of pages) {
    // Convert route path to key: /todos → todos, /websocket → websocket
    const key = page.route.replace(/^\//, "").replace(/\//g, "-");
    routeKeys.push(`'${key}'`);
    const icon = ICON_MAP[page.name] || "Circle";

    // Generate label from key
    const label =
      key === "todos"
        ? "Todo List"
        : key === "notifications"
          ? "Notifications"
          : key === "websocket"
            ? "WebSocket"
            : key.charAt(0).toUpperCase() + key.slice(1);

    routeEntries.push(
      `  ${key}: { label: '${label}', icon: ${icon}, path: '${page.route}' },`,
    );
  }

  const iconsStr = [...iconsNeeded].join(", ");

  // Determine if AuthButton should be shown (only if admin module is included)
  const authButtonImport = resolved.hasAdmin
    ? `\nimport { AuthButton } from './AuthButton'`
    : "";
  const authButtonElement = resolved.hasAdmin
    ? `\n          <AuthButton />`
    : "";

  return `import { NavLink } from 'react-router-dom'
import { ${iconsStr} } from 'lucide-react'${authButtonImport}

type RouteKey = ${routeKeys.join(" | ")}

const routes: Record<RouteKey, { label: string; icon: typeof CheckCircle; path: string }> = {
${routeEntries.join("\n")}
}

export function Navigation() {
  return (
    <nav className="nav-container">
      <div className="nav-brand">
        <Rocket size={24} />
        <span>Biomimic App</span>
      </div>
      <div className="nav-links">
        {(Object.keys(routes) as RouteKey[]).map((key) => {
          const route = routes[key]
          const Icon = route.icon
          return (
            <NavLink
              key={key}
              to={route.path}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={18} />
              <span>{route.label}</span>
            </NavLink>
          )
        })}
      </div>
      <div className="nav-actions">${authButtonElement}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          <Github size={18} />
        </a>
      </div>
    </nav>
  )
}
`;
}
