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
