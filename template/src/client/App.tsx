/**
 * Main Application with SPA Routing
 * Demonstrates three example modules: Todo, Notification, WebSocket
 */

import { useState, useEffect } from 'react';
import { CheckCircle, Bell, Plug, Rocket, Github } from 'lucide-react';
import { TodoPage } from './pages/TodoPage';
import { NotificationPage } from './pages/NotificationPage';
import { WebSocketPage } from './pages/WebSocketPage';

type Route = 'todos' | 'notifications' | 'websocket';

const routes: Record<Route, { label: string; icon: React.FC<{ className?: string }>; component: React.FC }> = {
  todos: { label: 'Todo List', icon: CheckCircle, component: TodoPage },
  notifications: { label: 'Notifications', icon: Bell, component: NotificationPage },
  websocket: { label: 'WebSocket', icon: Plug, component: WebSocketPage },
};

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<Route>(() => {
    const hash = window.location.hash.slice(1) as Route;
    return hash in routes ? hash : 'todos';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as Route;
      if (hash in routes) {
        setCurrentRoute(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.location.hash = currentRoute;
  }, [currentRoute]);

  const CurrentPage = routes[currentRoute].component;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="app-container">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50" data-testid="app-nav">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2" data-testid="app-title">
              <Rocket className="w-6 h-6 text-blue-500" />
              Biomimic App
            </h1>
            <div className="flex items-center gap-1">
              {(Object.keys(routes) as Route[]).map((route) => {
                const Icon = routes[route].icon;
                return (
                  <button
                    key={route}
                    onClick={() => setCurrentRoute(route)}
                    data-testid={`nav-${route}-button`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentRoute === route
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {routes[route].label}
                  </button>
                );
              })}
            </div>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="github-link"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </nav>

      <main className="py-8" data-testid="app-main">
        <CurrentPage />
      </main>

      <footer className="py-8 text-center text-gray-500 text-sm border-t border-gray-200 bg-white" data-testid="app-footer">
        <p className="flex items-center justify-center gap-2">
          Built with <span className="font-medium text-gray-700">Hono RPC</span> + <span className="font-medium text-gray-700">React</span> + <span className="font-medium text-gray-700">TypeScript</span>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Demonstrates: CRUD Operations | SSE (Server-Sent Events) | WebSocket
        </p>
      </footer>
    </div>
  );
};
