import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse } from '@server/utils/route-helpers'
import { TopicsResponseSchema, ProfileResponseSchema } from '@shared/schemas'

const MOCK_TOPICS = [
  {
    id: '1',
    title: 'How to implement real-time notifications with SSE?',
    excerpt:
      'I am trying to set up server-sent events for my community app. The connection keeps dropping after a few minutes. Has anyone dealt with this issue before?',
    votes: 24,
    replyCount: 8,
    viewCount: 342,
    status: 'solved' as const,
    tags: [
      { label: 'SSE', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Real-time', color: 'bg-blue-100 text-blue-700' },
    ],
    author: { name: 'Sarah Chen', initials: 'SC' },
    createdAt: '1h ago',
  },
  {
    id: '2',
    title: 'Best practices for WebSocket reconnection logic',
    excerpt:
      'My WebSocket client disconnects when the user switches tabs. What reconnection strategies do you recommend for a production environment?',
    votes: 18,
    replyCount: 0,
    viewCount: 156,
    status: 'unanswered' as const,
    tags: [
      { label: 'WebSocket', color: 'bg-purple-100 text-purple-700' },
      { label: 'Architecture', color: 'bg-orange-100 text-orange-700' },
    ],
    author: { name: 'Alex Rivera', initials: 'AR' },
    createdAt: '2h ago',
  },
  {
    id: '3',
    title: 'Type-safe API routes with Hono RPC — a complete guide',
    excerpt:
      'After months of using Hono RPC in production, here is my comprehensive guide to achieving full end-to-end type safety across your stack.',
    votes: 56,
    replyCount: 12,
    viewCount: 891,
    status: 'hot' as const,
    tags: [
      { label: 'Hono', color: 'bg-sky-100 text-sky-700' },
      { label: 'TypeScript', color: 'bg-blue-100 text-blue-700' },
      { label: 'Guide', color: 'bg-emerald-100 text-emerald-700' },
    ],
    author: { name: 'Jordan Park', initials: 'JP' },
    createdAt: '3h ago',
  },
  {
    id: '4',
    title: 'Deploying Hono apps to Cloudflare Workers with D1',
    excerpt:
      'Step-by-step walkthrough of deploying a full-stack Hono application to Cloudflare Workers, including database setup with D1 and R2 storage.',
    votes: 31,
    replyCount: 5,
    viewCount: 478,
    status: 'solved' as const,
    tags: [
      { label: 'Cloudflare', color: 'bg-amber-100 text-amber-700' },
      { label: 'Deployment', color: 'bg-rose-100 text-rose-700' },
    ],
    author: { name: 'Mika Tanaka', initials: 'MT' },
    createdAt: '5h ago',
  },
  {
    id: '5',
    title: 'Zustand vs Jotai — which state manager for community apps?',
    excerpt:
      'Comparing Zustand and Jotai for a medium-complexity community application. Performance benchmarks and developer experience included.',
    votes: 42,
    replyCount: 0,
    viewCount: 267,
    status: 'unanswered' as const,
    tags: [
      { label: 'React', color: 'bg-cyan-100 text-cyan-700' },
      { label: 'State Management', color: 'bg-violet-100 text-violet-700' },
    ],
    author: { name: 'Liam Nguyen', initials: 'LN' },
    createdAt: '8h ago',
  },
  {
    id: '6',
    title: 'Building a plugin system with module manifests',
    excerpt:
      'How we designed a declarative module manifest system that lets users scaffold apps with only the features they need. Patterns and lessons learned.',
    votes: 67,
    replyCount: 19,
    viewCount: 1204,
    status: 'hot' as const,
    tags: [
      { label: 'Architecture', color: 'bg-orange-100 text-orange-700' },
      { label: 'Plugins', color: 'bg-pink-100 text-pink-700' },
    ],
    author: { name: 'Emma Wilson', initials: 'EW' },
    createdAt: '12h ago',
  },
  {
    id: '7',
    title: 'Optimizing React components with useMemo and useCallback',
    excerpt:
      'Understanding when and how to use React hooks for performance optimization. Real-world examples and benchmarks showing measurable improvements.',
    votes: 45,
    replyCount: 15,
    viewCount: 678,
    status: 'discussion' as const,
    tags: [
      { label: 'React', color: 'bg-cyan-100 text-cyan-700' },
      { label: 'Performance', color: 'bg-amber-100 text-amber-700' },
    ],
    author: { name: '张伟', initials: 'ZW' },
    createdAt: '1d ago',
  },
  {
    id: '8',
    title: 'PostgreSQL query optimization for large datasets',
    excerpt:
      'Strategies for handling millions of rows with efficient indexing, query planning, and materialized views. Includes EXPLAIN ANALYZE walkthrough.',
    votes: 89,
    replyCount: 23,
    viewCount: 1567,
    status: 'hot' as const,
    tags: [
      { label: 'PostgreSQL', color: 'bg-blue-100 text-blue-700' },
      { label: 'Database', color: 'bg-indigo-100 text-indigo-700' },
      { label: 'Performance', color: 'bg-amber-100 text-amber-700' },
    ],
    author: { name: 'Raj Sharma', initials: 'RS' },
    createdAt: '1d ago',
  },
  {
    id: '9',
    title: 'Implementing JWT authentication with refresh tokens',
    excerpt:
      'Secure authentication flow with JWT access tokens and refresh tokens. Best practices for token storage, rotation, and revocation.',
    votes: 72,
    replyCount: 18,
    viewCount: 1245,
    status: 'solved' as const,
    tags: [
      { label: 'Auth', color: 'bg-rose-100 text-rose-700' },
      { label: 'Security', color: 'bg-red-100 text-red-700' },
      { label: 'JWT', color: 'bg-pink-100 text-pink-700' },
    ],
    author: { name: '田中太郎', initials: 'TT' },
    createdAt: '2d ago',
  },
  {
    id: '10',
    title: 'Building microservices with Docker and Kubernetes',
    excerpt:
      'Complete guide to containerizing Node.js applications and orchestrating them with Kubernetes. Includes service discovery, load balancing, and autoscaling.',
    votes: 103,
    replyCount: 31,
    viewCount: 1890,
    status: 'hot' as const,
    tags: [
      { label: 'Docker', color: 'bg-sky-100 text-sky-700' },
      { label: 'Kubernetes', color: 'bg-blue-100 text-blue-700' },
      { label: 'Microservices', color: 'bg-violet-100 text-violet-700' },
    ],
    author: { name: 'Marie Dubois', initials: 'MD' },
    createdAt: '2d ago',
  },
  {
    id: '11',
    title: 'Writing accessible React applications',
    excerpt:
      'Essential ARIA patterns and semantic HTML for building inclusive web apps. Screen reader testing checklist and common accessibility pitfalls.',
    votes: 58,
    replyCount: 14,
    viewCount: 923,
    status: 'open' as const,
    tags: [
      { label: 'Accessibility', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'React', color: 'bg-cyan-100 text-cyan-700' },
      { label: 'A11y', color: 'bg-lime-100 text-lime-700' },
    ],
    author: { name: '김민수', initials: 'KM' },
    createdAt: '3d ago',
  },
  {
    id: '12',
    title: 'TypeScript utility types explained with examples',
    excerpt:
      'Deep dive into TypeScript utility types like Pick, Omit, Partial, Record, and more. Practical examples for everyday use.',
    votes: 81,
    replyCount: 22,
    viewCount: 1456,
    status: 'hot' as const,
    tags: [
      { label: 'TypeScript', color: 'bg-blue-100 text-blue-700' },
      { label: 'Guide', color: 'bg-emerald-100 text-emerald-700' },
    ],
    author: { name: 'Anna Müller', initials: 'AM' },
    createdAt: '3d ago',
  },
  {
    id: '13',
    title: 'Redis caching strategies for high-traffic APIs',
    excerpt:
      'Implementing Redis caching layers for REST APIs. Cache invalidation strategies, TTL policies, and handling cache stampedes.',
    votes: 64,
    replyCount: 9,
    viewCount: 1012,
    status: 'solved' as const,
    tags: [
      { label: 'Redis', color: 'bg-red-100 text-red-700' },
      { label: 'Caching', color: 'bg-orange-100 text-orange-700' },
      { label: 'API', color: 'bg-sky-100 text-sky-700' },
    ],
    author: { name: 'Carlos Silva', initials: 'CS' },
    createdAt: '3d ago',
  },
  {
    id: '14',
    title: 'GraphQL Federation for microservices architecture',
    excerpt:
      'Combining multiple GraphQL services into a unified API with Apollo Federation. Schema stitching, type composition, and distributed tracing.',
    votes: 47,
    replyCount: 0,
    viewCount: 623,
    status: 'unanswered' as const,
    tags: [
      { label: 'GraphQL', color: 'bg-pink-100 text-pink-700' },
      { label: 'Microservices', color: 'bg-violet-100 text-violet-700' },
    ],
    author: { name: '李明', initials: 'LM' },
    createdAt: '4h ago',
  },
  {
    id: '15',
    title: 'Testing React components with Vitest and Testing Library',
    excerpt:
      'Modern testing setup with Vitest and React Testing Library. Writing maintainable tests, mocking external dependencies, and snapshot testing.',
    votes: 76,
    replyCount: 17,
    viewCount: 1234,
    status: 'discussion' as const,
    tags: [
      { label: 'Testing', color: 'bg-amber-100 text-amber-700' },
      { label: 'React', color: 'bg-cyan-100 text-cyan-700' },
      { label: 'Vitest', color: 'bg-purple-100 text-purple-700' },
    ],
    author: { name: 'Elena Popova', initials: 'EP' },
    createdAt: '5h ago',
  },
  {
    id: '16',
    title: 'RESTful API design best practices',
    excerpt:
      'Comprehensive guide to designing REST APIs. Resource naming, HTTP methods, status codes, pagination, filtering, and versioning strategies.',
    votes: 92,
    replyCount: 28,
    viewCount: 1678,
    status: 'hot' as const,
    tags: [
      { label: 'API Design', color: 'bg-sky-100 text-sky-700' },
      { label: 'REST', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Architecture', color: 'bg-orange-100 text-orange-700' },
    ],
    author: { name: '佐藤健', initials: 'SK' },
    createdAt: '6h ago',
  },
  {
    id: '17',
    title: 'CSS Grid vs Flexbox — when to use which?',
    excerpt:
      'Practical comparison of CSS Grid and Flexbox layouts. Use cases, browser support, and examples of combining both for complex layouts.',
    votes: 39,
    replyCount: 8,
    viewCount: 567,
    status: 'open' as const,
    tags: [
      { label: 'CSS', color: 'bg-indigo-100 text-indigo-700' },
      { label: 'Layout', color: 'bg-purple-100 text-purple-700' },
    ],
    author: { name: 'Olga Ivanova', initials: 'OI' },
    createdAt: '8h ago',
  },
  {
    id: '18',
    title: 'Setting up CI/CD pipeline with GitHub Actions',
    excerpt:
      'Automating testing, building, and deployment with GitHub Actions. Multi-environment configs, secrets management, and deployment strategies.',
    votes: 68,
    replyCount: 13,
    viewCount: 1102,
    status: 'solved' as const,
    tags: [
      { label: 'CI/CD', color: 'bg-rose-100 text-rose-700' },
      { label: 'GitHub', color: 'bg-slate-100 text-slate-700' },
      { label: 'DevOps', color: 'bg-blue-100 text-blue-700' },
    ],
    author: { name: '黄志强', initials: 'HZ' },
    createdAt: '30m ago',
  },
  {
    id: '19',
    title: 'Node.js event loop explained in depth',
    excerpt:
      'Understanding the Node.js event loop, call stack, and asynchronous operations. Performance implications and best practices for event-driven apps.',
    votes: 55,
    replyCount: 11,
    viewCount: 845,
    status: 'discussion' as const,
    tags: [
      { label: 'Node.js', color: 'bg-green-100 text-green-700' },
      { label: 'Performance', color: 'bg-amber-100 text-amber-700' },
    ],
    author: { name: 'Giovanni Rossi', initials: 'GR' },
    createdAt: '45m ago',
  },
  {
    id: '20',
    title: 'Handling file uploads in multipart/form-data with Hono',
    excerpt:
      'Implementing secure file upload endpoints in Hono. Validation, storage with R2, handling large files, and progress tracking.',
    votes: 71,
    replyCount: 16,
    viewCount: 1323,
    status: 'solved' as const,
    tags: [
      { label: 'Hono', color: 'bg-sky-100 text-sky-700' },
      { label: 'File Upload', color: 'bg-indigo-100 text-indigo-700' },
      { label: 'R2', color: 'bg-amber-100 text-amber-700' },
    ],
    author: { name: 'Priya Patel', initials: 'PP' },
    createdAt: '2h ago',
  },
  {
    id: '21',
    title: 'Debouncing and throttling in React applications',
    excerpt:
      'Implementing debouncing and throttling for search inputs, scroll events, and API calls. Custom hooks and performance considerations.',
    votes: 33,
    replyCount: 5,
    viewCount: 445,
    status: 'open' as const,
    tags: [
      { label: 'React', color: 'bg-cyan-100 text-cyan-700' },
      { label: 'Performance', color: 'bg-amber-100 text-amber-700' },
      { label: 'Hooks', color: 'bg-pink-100 text-pink-700' },
    ],
    author: { name: '山本花子', initials: 'YH' },
    createdAt: '1w ago',
  },
]

const MOCK_PROFILE_ACTIVITY = [
  {
    id: '1',
    type: 'reply' as const,
    text: 'Replied to',
    target: 'How to implement real-time notifications with SSE?',
    time: '2h ago',
  },
  {
    id: '2',
    type: 'topic' as const,
    text: 'Created topic',
    target: 'Best practices for WebSocket reconnection logic',
    time: '5h ago',
  },
  {
    id: '3',
    type: 'like' as const,
    text: 'Liked',
    target: 'Type-safe API routes with Hono RPC — a complete guide',
    time: '8h ago',
  },
  {
    id: '4',
    type: 'reply' as const,
    text: 'Replied to',
    target: 'Deploying Hono apps to Cloudflare Workers with D1',
    time: '1d ago',
  },
  {
    id: '5',
    type: 'topic' as const,
    text: 'Created topic',
    target: 'Zustand vs Jotai — which state manager for community apps?',
    time: '2d ago',
  },
  {
    id: '6',
    type: 'like' as const,
    text: 'Liked',
    target: 'Building a plugin system with module manifests',
    time: '3d ago',
  },
  {
    id: '7',
    type: 'reply' as const,
    text: 'Replied to',
    target: 'How to set up CI/CD for monorepo projects',
    time: '4d ago',
  },
  {
    id: '8',
    type: 'topic' as const,
    text: 'Created topic',
    target: 'Tailwind CSS v4 migration guide and tips',
    time: '5d ago',
  },
]

const getTopicsRoute = createRoute({
  method: 'get',
  path: '/topics',
  responses: {
    200: successResponse(TopicsResponseSchema, 'List community topics'),
  },
})

const getPopularTopicsRoute = createRoute({
  method: 'get',
  path: '/topics/popular',
  responses: {
    200: successResponse(TopicsResponseSchema, 'Popular topics'),
  },
})

const getProfileRoute = createRoute({
  method: 'get',
  path: '/profile',
  responses: {
    200: successResponse(ProfileResponseSchema, 'User profile'),
  },
})

export const topicsRoutes = new OpenAPIHono()
  .openapi(getTopicsRoute, async c => {
    return c.json({ success: true as const, data: MOCK_TOPICS })
  })
  .openapi(getPopularTopicsRoute, async c => {
    const popular = [...MOCK_TOPICS].sort((a, b) => b.votes - a.votes)
    return c.json({ success: true as const, data: popular })
  })
  .openapi(getProfileRoute, async c => {
    return c.json({
      success: true as const,
      data: {
        stats: { topics: 12, replies: 48, likes: 156 },
        activity: MOCK_PROFILE_ACTIVITY,
      },
    })
  })
