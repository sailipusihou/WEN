import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { AI_TOOLS, AI_WRITE_TOOLS, executeTool } from '@/lib/ai-tools'
import { resolveLLMConfig } from '@/lib/ai-config'
import { runMarketingWorkflow } from '@/lib/ai-marketing-workflow'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: any[]
  tool_call_id?: string
  name?: string
}

const TOOL_LABELS: Record<string, string> = {
  get_order_stats: '查询订单统计',
  list_orders: '查询订单列表',
  get_order_detail: '查询订单详情',
  get_sales_stats: '分析销售数据',
  list_products: '查询商品列表',
  get_product_detail: '查询商品详情',
  get_inventory_summary: '查询库存情况',
  list_customers: '查询客户列表',
  get_customer_detail: '查询客户详情',
  list_messages: '查询客户留言',
  list_reviews: '查询商品评论',
  get_categories: '获取商品分类',
  get_system_info: '获取系统信息',
  get_sales_diagnosis: '生成销售诊断报告',
  export_orders_report: '生成订单报表',
  export_inventory_report: '生成库存报表',
  export_customers_report: '生成客户报表',
  recommend_products: '智能商品推荐',
  update_product_stock: '修改商品库存',
  update_product_price: '调整商品价格',
  update_order_status: '更新订单状态',
  reply_to_message: '回复客户留言',
  batch_update_stock: '批量修改库存',
  batch_update_price: '批量修改价格',
  batch_ship_orders: '批量标记发货',
  discover_schema: '扫描数据表结构',
  query_table: '查询数据表',
  search_knowledge_base: '搜索知识库',
  list_knowledge_base: '列出知识库',
  list_social_accounts: '查询社交账号',
  run_marketing_workflow: '一键营销工作流',
  forecast_sales: '预测未来销量',
  get_customer_segments: '客户画像与分群',
  suggest_pricing: '智能定价建议',
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'ai_assistant')
  if ('error' in auth) return auth.error
  const user = auth.user

  try {
    const body = await req.json()
    const { messages, provider, model, apiKey, baseUrl } = body as { messages: ChatMessage[]; provider?: string; model?: string; apiKey?: string; baseUrl?: string }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const settings = getRepository().settings.get()
    const llm = resolveLLMConfig(settings, { provider, model, apiKey, baseUrl })

    if (!settings.aiEnabled) {
      return NextResponse.json({ error: 'AI Assistant is disabled. Please enable it in Settings → System → AI Assistant, then save.' }, { status: 503 })
    }
    if (!llm.apiKey) {
      return NextResponse.json({ error: 'No API Key configured. Please set it in Settings → System → AI Assistant, then save.' }, { status: 503 })
    }

    const systemPrompt = settings.aiSystemPrompt || 'You are a helpful e-commerce assistant.'

    const personalityPrompts: Record<string, string> = {
      professional: 'You are a professional and detail-oriented operations analyst. Use formal, precise language. Focus on data accuracy and actionable insights. Structure your responses clearly with headings and bullet points when appropriate.',
      friendly: 'You are warm, friendly, and encouraging. Use a conversational tone like a trusted colleague. Add occasional emojis to make interactions pleasant. Celebrate wins and frame challenges positively.',
      humorous: 'You have a witty and playful personality. You enjoy light humor and playful remarks, but never at the expense of professionalism. You sprinkle in jokes and fun observations while still providing accurate, helpful information.',
      concise: 'You are extremely efficient and to-the-point. Use minimal words — just the facts and key numbers. No pleasantries, no filler. Get straight to the answer in the fewest words possible.',
    }

    const personalityPrompt = personalityPrompts[settings.aiPersonality as string] || personalityPrompts.professional

    const contextPrompt = `You are ${settings.aiAssistantName || 'Aria'}, an AI assistant for ${settings.siteName || 'Low Flame'}.

${personalityPrompt}

${systemPrompt}

IMPORTANT RULES:
1. You have access to tools that can query real data from the store. USE THEM instead of guessing or making up numbers.
2. When a user asks about orders, sales, products, inventory, customers, messages, or reviews — call the appropriate tool first.
3. Never make up data. If you don't know or can't find the data, say so honestly.
4. All tool results are from the real database — use them to answer the user's question.
5. Keep responses clear and well-formatted. Use tables when presenting lists of data.
6. Do NOT disclose passwords, API keys, permission settings, or any sensitive system configuration.
7. If you need to use multiple tools to answer a question, call them one at a time.
8. LANGUAGE: Always respond in the SAME language the user uses. If the user writes in Chinese, reply in Chinese. If in English, reply in English. If mixed, match the dominant language. Never translate the user's question — just answer naturally in their language.
9. WRITE OPERATIONS REQUIRE CONFIRMATION:
   - When you call a write tool (update_product_stock, update_product_price, update_order_status, reply_to_message, batch_update_stock, batch_update_price, batch_ship_orders), the tool result will include requires_confirmation: true.
   - This means you MUST NOT assume the action was performed.
   - Instead, present the action details to the user and ask for confirmation using this EXACT format:

   \`\`\`action
   action: update_product_stock
   description: 将「青瓷茶具套装」的库存从 2 修改为 50
   args:
     productId: celadon-tea-set
     stock: 50
   \`\`\`

   - Place this action block at the beginning of your response.
   - Then explain in Chinese what the action will do, and ask the user to click "确认执行" to confirm, or "取消" to cancel.
   - Be specific about what changes will be made (old value → new value).
   - NEVER say the action was completed when requires_confirmation is true.
10. For data visualization, you can embed charts using this exact format:

\`\`\`chart
type: pie
title: 订单状态分布
- 待处理: 5
- 已发货: 3
- 已送达: 2
\`\`\`

Supported chart types: pie (饼图), bar (柱状图), line (折线图).
Use charts when presenting distributions, rankings, or trends. Place the chart BEFORE the text explanation for better readability.
You can add custom colors like: - 待处理: 5, color: #f59e0b

11. For CSV report exports, use the export_* tools:
- export_orders_report: Generate orders report (accepts days and optional status filter)
- export_inventory_report: Generate inventory report (accepts lowStockOnly option)
- export_customers_report: Generate customers report

When user asks for "导出", "报表", "download", "export", "csv" — call the appropriate export tool first. The report will appear as a downloadable CSV card in the chat.
Do NOT manually format data as report blocks — always use the export tools.

12. DYNAMIC DATA AWARENESS:
- The store backend may add new fields, new tables, or new config items over time. You are NOT limited to the dedicated tools above.
- If a user asks about data that dedicated tools don't cover, call \`discover_schema\` first to scan the actual table structure (it returns all current fields, types, and samples).
- Then call \`query_table\` to fetch the actual data. \`query_table\` supports filter (with $gte/$lte/$like operators), limit, and fields parameters.
- Sensitive fields (passwords, tokens, API keys) are automatically redacted — never attempt to bypass this.
- This means you can answer questions about NEW features/data the admin adds in the future, even if no dedicated tool exists yet.

13. KNOWLEDGE BASE (店铺规则/政策/SOP):
- When users ask about store policies (returns, shipping, refunds), FAQs, product usage, or operational SOPs, ALWAYS call \`search_knowledge_base\` first.
- If the knowledge base has relevant entries, base your answer on them and cite the source ("根据店铺政策：...").
- If \`search_knowledge_base\` returns no results, do NOT make up policies. Honestly say "知识库中暂无此信息" and suggest the admin add it.
- To browse what's in the knowledge base, use \`list_knowledge_base\`.

14. ONE-CLICK MARKETING WORKFLOW（一键营销工作流）:
- 当用户要求“给某商品生成推广文案/图片/视频并发布到社交平台”（例如：给 XX 产品生成推广文案和图片视频并发布到我的 Instagram）时，调用 \`run_marketing_workflow\` 工具。
- 步骤：先调用 \`list_products\` 确认商品ID；如果要发布，再调用 \`list_social_accounts\` 确认可用的发布账号；然后调用 \`run_marketing_workflow\`，传入 productId、platform（默认 instagram）、publish=true，可附上 prompt 营销重点。
- 该工具会自动依次完成：文案生成 → 配图生成 → 图生视频 → 发布，并把每一步进度与最终图片/视频/发布结果返回。不要自己模拟生成或发布，也不要要求用户手动操作面板。
- 如果用户没指定商品，先询问或推荐商品；如果指定平台无已连接账号，如实告知并建议先连接账号。

Current user: ${user.name} (${user.role}). Current time: ${new Date().toISOString()}.
Currency: ${settings.currency || 'USD'}.`

    let currentMessages: ChatMessage[] = [
      { role: 'system', content: contextPrompt },
      ...messages.filter(m => m.role === 'user' || m.role === 'assistant'),
    ]

    const encoder = new TextEncoder()
    const maxIterations = 5
    let iteration = 0

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'thinking', content: '思考中...' }) + '\n'))

          while (iteration < maxIterations) {
            iteration++

            const aiResponse = await fetch(`${llm.baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llm.apiKey}`,
              },
              body: JSON.stringify({
                model: llm.model,
                messages: currentMessages,
                tools: [...AI_TOOLS, ...AI_WRITE_TOOLS].map(t => ({
                  type: 'function',
                  function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                  },
                })),
                tool_choice: 'auto',
                stream: false,
                temperature: 0.7,
                max_tokens: 2000,
              }),
            })

            if (!aiResponse.ok) {
              const errorText = await aiResponse.text()
              console.error('[AI Chat] API error:', aiResponse.status, errorText)
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', content: `AI provider error (${aiResponse.status}). Check API key and model name.` }) + '\n'))
              controller.close()
              return
            }

            const data = await aiResponse.json()
            const choice = data.choices?.[0]
            const message = choice?.message

            if (!message) {
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', content: 'Invalid AI response' }) + '\n'))
              controller.close()
              return
            }

            if (message.tool_calls && message.tool_calls.length > 0) {
              currentMessages.push(message)

              for (const toolCall of message.tool_calls) {
                const toolName = toolCall.function?.name
                let toolArgs: any = {}
                try {
                  toolArgs = JSON.parse(toolCall.function?.arguments || '{}')
                } catch (e) {
                  console.error('[AI Chat] Failed to parse tool arguments:', e)
                }

                const isWriteTool = AI_WRITE_TOOLS.some(t => t.name === toolName)

                if (toolName === 'run_marketing_workflow') {
                  const label = TOOL_LABELS[toolName] || toolName
                  controller.enqueue(encoder.encode(JSON.stringify({ type: 'tool_start', tool: toolName, label, content: '正在执行一键营销工作流...' }) + '\n'))
                  try {
                    const result = await runMarketingWorkflow({
                      productId: toolArgs.productId,
                      platform: toolArgs.platform,
                      publish: toolArgs.publish !== false,
                      publishAccountId: toolArgs.publishAccountId,
                      prompt: toolArgs.prompt,
                      cookie: req.headers.get('cookie') || '',
                      origin: req.nextUrl.origin,
                      onStep: (ev) => {
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'workflow_step', ...ev }) + '\n'))
                      },
                    })
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'workflow_result', ...result }) + '\n'))
                    currentMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      name: toolName,
                      content: JSON.stringify(result),
                    })
                  } catch (err: any) {
                    const msg = err?.message || '工作流执行失败'
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'workflow_step', step: 'error', label: '工作流失败', status: 'error', detail: msg }) + '\n'))
                    currentMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      name: toolName,
                      content: JSON.stringify({ success: false, error: msg }),
                    })
                  }
                } else if (isWriteTool) {
                  const label = TOOL_LABELS[toolName] || toolName
                  controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'tool_confirm',
                    tool: toolName,
                    label,
                    args: toolArgs,
                    content: `需要确认：${label}`,
                  }) + '\n'))

                  const confirmResult = {
                    requires_confirmation: true,
                    action: toolName,
                    args: toolArgs,
                    description: `操作类型：${label}`,
                    message: `This action requires user confirmation. Please present the action details and ask the user to confirm before proceeding. Use the \`\`\`action format block format to present the action.`,
                  }

                  currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolName,
                    content: JSON.stringify(confirmResult),
                  })
                } else {
                  const label = TOOL_LABELS[toolName] || toolName
                  controller.enqueue(encoder.encode(JSON.stringify({ type: 'tool_start', tool: toolName, label, content: `正在${label}...` }) + '\n'))

                  console.log('[AI Chat] Tool call:', toolName, toolArgs)

                  const toolResult = await executeTool(toolName, toolArgs)

                  controller.enqueue(encoder.encode(JSON.stringify({ type: 'tool_done', tool: toolName, label, content: `${label}完成`, result: toolResult }) + '\n'))

                  currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolName,
                    content: JSON.stringify(toolResult),
                  })
                }
              }

              controller.enqueue(encoder.encode(JSON.stringify({ type: 'thinking', content: '整理数据中...' }) + '\n'))
              continue
            }

            const finalContent = message.content || ''
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'final', content: finalContent }) + '\n'))
            controller.close()
            return
          }

          controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', content: 'Too many tool calls. Please try a simpler question.' }) + '\n'))
          controller.close()
        } catch (error) {
          console.error('[AI Chat] Error:', error)
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', content: `AI 服务连接失败，请检查网络/代理后重试。(${(error as any)?.message || 'unknown'})` }) + '\n'))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    return NextResponse.json({ error: `AI 服务连接失败，请检查网络/代理后重试。(${(error as any)?.message || 'unknown'})` }, { status: 500 })
  }
}
