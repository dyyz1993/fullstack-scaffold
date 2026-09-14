/**
 * @framework-baseline a841a8a0bfb44beb
 * @framework-modify
 * @reason 输入超长白屏修复（P1/P2）：新增前端表单长度上限常量，与 shared 下各模块
 *         schemas 的 zod 约束保持一致，提交前拦截超长输入避免后端 400
 * @impact TodoPage / PublishPage / PluginDetailPage / RegisterPage 的
 *         maxLength 属性与提交前长度校验
 */

/**
 * 前端表单长度上限，与 shared 下各模块 schemas 的 zod 约束保持一致。
 * 目的：提交前拦截超长输入，避免服务端 400（治标）；服务端 400 的容错
 * 解析在 api-error.ts（治本），两者配合使用。
 */

/** Todo 标题（CreateTodoSchema.title max 200） */
export const TODO_TITLE_MAX = 200
/** Todo 描述（CreateTodoSchema.description max 1000） */
export const TODO_DESCRIPTION_MAX = 1000
/** 插件名称/Slug（CreatePluginSchema max 200） */
export const PLUGIN_NAME_MAX = 200
export const PLUGIN_SLUG_MAX = 200
/** 插件描述（CreatePluginSchema.description max 2000） */
export const PLUGIN_DESCRIPTION_MAX = 2000
/** 评论标题/内容（CreateReviewSchema max 200 / 2000） */
export const REVIEW_TITLE_MAX = 200
export const REVIEW_CONTENT_MAX = 2000
/** 注册用户名/密码（RegisterSchema min/max） */
export const USERNAME_MIN = 3
export const USERNAME_MAX = 50
export const PASSWORD_MIN = 6
export const PASSWORD_MAX = 100
