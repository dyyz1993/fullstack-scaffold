/**
 * @framework-baseline c934bac96702cb89
 */

/**
 * 禁止导出链式 merge 后的巨型 app 类型（TS2589 的根源治理）
 *
 * 背景：route-registry 把 N 个模块 .route() 链式合并，Hono 的类型系统在每一环
 * 都携带前面所有环的完整累积。把这种 merge 结果导出为类型（typeof / ReturnType）
 * 并被 hc<T> 实例化时，TypeScript 需要深度展开整个链条，超过 instantiationDepth
 * 100 就报 TS2589。历史上曾用 typescript+5.9.3.patch 把上限改到 1000 来绕过，
 * 代价是编译变慢、编辑器不稳定（该 patch 已被 no-ts-patch validator 禁止）。
 *
 * 正确模式：每个模块导出自己的窄类型（深度 = 1），客户端按模块实例化 hc。
 * 运行时链式挂载（.route()）本身合法——本规则只封"类型出口"，不碰运行时。
 *
 * 检测三种出口形态：
 * 1. export type X = typeof <初始化含 ≥2 个 .route() 的变量>
 * 2. export type X = ReturnType<typeof <函数体内含 ≥2 个 .route() 的函数>>
 * 3. export type X = ReturnType<typeof hc<MegaType>>>（测试客户端的 mega 实例化）
 */

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
  const sourceCode = context.sourceCode || context.getSourceCode()

  // 变量名 → 初始化子树内 .route() 调用 ≥2 次的声明
  const chainedVars = new Map()
  // 函数名 → 函数体子树内 .route() 调用 ≥2 次的声明
  const appFactories = new Map()
  // 待分析的 type alias（在 Program:exit 统一判定，避免依赖源码顺序）
  const typeAliases = []

  /**
   * 统计子树内 .route() 调用次数（不依赖链根，嵌套闭包内的也算）
   * @param {import('eslint').Rule.Node} node
   */
  function countRouteCalls(node) {
    if (!node || typeof node.type !== 'string') return 0
    let count = 0
    if (
      node.type === 'CallExpression' &&
      node.callee &&
      node.callee.type === 'MemberExpression' &&
      node.callee.property &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'route'
    ) {
      count++
    }
    const keys = sourceCode.visitorKeys[node.type] || []
    for (const key of keys) {
      const child = node[key]
      if (Array.isArray(child)) {
        for (const c of child) count += countRouteCalls(c)
      } else if (child && typeof child.type === 'string') {
        count += countRouteCalls(child)
      }
    }
    return count
  }

  return {
    VariableDeclarator(node) {
      if (!node.init || !node.id || node.id.type !== 'Identifier') return
      if (countRouteCalls(node.init) >= 2) {
        chainedVars.set(node.id.name, node)
      }
    },

    FunctionDeclaration(node) {
      if (!node.id || !node.body) return
      if (countRouteCalls(node.body) >= 2) {
        appFactories.set(node.id.name, node)
      }
    },

    TSTypeAliasDeclaration(node) {
      typeAliases.push(node)
    },

    'Program:exit'() {
      for (const alias of typeAliases) {
        // 只约束导出的类型别名（规则名与语义都是 "export"）
        const isExported = alias.parent && alias.parent.type === 'ExportNamedDeclaration'

        // typeAnnotation 直接就是类型节点（TSTypeQuery / TSTypeReference），没有中间包装
        const typeRef = alias.typeAnnotation

        // 形态 1: typeof <chainedVar>
        if (typeRef && typeRef.type === 'TSTypeQuery') {
          const exprName = typeRef.exprName
          if (
            isExported &&
            exprName &&
            exprName.type === 'Identifier' &&
            chainedVars.has(exprName.name)
          ) {
            context.report({
              node: alias,
              messageId: 'noMergedTypeExport',
              data: { name: exprName.name },
            })
          }
        }

        // 形态 2/3: ReturnType<...>
        if (
          typeRef &&
          typeRef.type === 'TSTypeReference' &&
          typeRef.typeName &&
          typeRef.typeName.type === 'Identifier' &&
          typeRef.typeName.name === 'ReturnType' &&
          typeRef.typeArguments &&
          typeRef.typeArguments.params &&
          typeRef.typeArguments.params.length > 0
        ) {
          const arg = typeRef.typeArguments.params[0]

          // 形态 3: typeof hc<AppType> —— instantiation expression
          if (
            isExported &&
            arg.type === 'TSTypeQuery' &&
            arg.typeArguments &&
            arg.exprName &&
            arg.exprName.type === 'Identifier' &&
            arg.exprName.name === 'hc'
          ) {
            context.report({
              node: alias,
              messageId: 'noReturnTypeOfHcInstantiation',
            })
            continue
          }

          // 形态 2: typeof createApp
          if (
            isExported &&
            arg.type === 'TSTypeQuery' &&
            arg.exprName &&
            arg.exprName.type === 'Identifier' &&
            appFactories.has(arg.exprName.name)
          ) {
            context.report({
              node: alias,
              messageId: 'noReturnTypeOfAppFactory',
              data: { name: arg.exprName.name },
            })
          }
        }
      }
    },
  }
}

export const noMergedApiTypeExport = {
  meta: {
    type: 'problem',
    docs: {
      description:
        '禁止导出链式 merge 后的巨型 app 类型（typeof / ReturnType），防止 TS2589 类型爆炸',
      recommended: true,
    },
    messages: {
      noMergedTypeExport:
        '禁止导出 `typeof {{{name}}}`：它的初始化链式合并了多个模块（≥2 个 .route()），' +
        '导出此类型会让 hc<T> 深度实例化整条链，触发 TS2589。\n\n' +
        '// ❌ 错误\n' +
        'export type ClientApiRoutes = typeof clientApiRoutes  // 11 个模块的 merge\n\n' +
        '// ✅ 正确 —— 每个模块导出自己的窄类型\n' +
        'export type TodosApiType = typeof apiRoutes            // 模块 routes 文件里\n' +
        'export const todosClient = hc<TodosApiType>("/api")    // 客户端按模块实例化',
      noReturnTypeOfAppFactory:
        '禁止导出 `ReturnType<typeof {{{name}}}>`：该工厂函数内部链式合并了多个模块（≥2 个 .route()），' +
        '此类型会把整条 merge 链暴露给类型系统，触发 TS2589。\n\n' +
        '// ❌ 错误\n' +
        'export type AppType = ReturnType<typeof createApp>\n\n' +
        '// ✅ 正确 —— 运行时类型用 Hono<AppBindings>，RPC 类型按模块拆分',
      noReturnTypeOfHcInstantiation:
        '禁止导出 `ReturnType<typeof hc<MegaType>>>`：用 merge 后的巨型类型实例化 hc ' +
        '正是 TS2589 的直接触发点（深度展开整条类型链）。\n\n' +
        '// ❌ 错误\n' +
        'export type TestClient = ReturnType<typeof hc<AppType>>\n\n' +
        '// ✅ 正确 —— 按模块组装的门面，每个属性是独立的窄客户端类型\n' +
        'export type TestClient = { api: { todos: TodosClient; chat: ChatClient } }',
    },
    schema: [],
  },
  create,
}
