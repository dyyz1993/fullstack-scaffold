import { z } from '@hono/zod-openapi'

export const TopicStatusSchema = z.enum(['hot', 'unanswered', 'solved'])

export const TopicTagSchema = z.object({
  label: z.string(),
  color: z.string(),
})

export const TopicAuthorSchema = z.object({
  name: z.string(),
  initials: z.string(),
})

export const TopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  excerpt: z.string(),
  votes: z.number(),
  replyCount: z.number(),
  viewCount: z.number(),
  status: TopicStatusSchema,
  tags: z.array(TopicTagSchema),
  author: TopicAuthorSchema,
  createdAt: z.string(),
})

export const TopicsResponseSchema = z.array(TopicSchema)

export const ProfileStatsSchema = z.object({
  topics: z.number(),
  replies: z.number(),
  likes: z.number(),
})

export const ActivityTypeSchema = z.enum(['topic', 'reply', 'like'])

export const ProfileActivitySchema = z.object({
  id: z.string(),
  type: ActivityTypeSchema,
  text: z.string(),
  target: z.string(),
  time: z.string(),
})

export const ProfileResponseSchema = z.object({
  stats: ProfileStatsSchema,
  activity: z.array(ProfileActivitySchema),
})

export type TopicStatus = z.infer<typeof TopicStatusSchema>
export type TopicTag = z.infer<typeof TopicTagSchema>
export type TopicAuthor = z.infer<typeof TopicAuthorSchema>
export type Topic = z.infer<typeof TopicSchema>
export type ProfileStats = z.infer<typeof ProfileStatsSchema>
export type ActivityType = z.infer<typeof ActivityTypeSchema>
export type ProfileActivity = z.infer<typeof ProfileActivitySchema>
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>
