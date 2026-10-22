// Claude Code hook: appends one office event per hook call. No model tokens involved.
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LOG = join(dirname(fileURLToPath(import.meta.url)), '.data', 'events.jsonl')
const MAX_TEXT = 80

const clip = (value) => String(value ?? '').replace(/\s+/g, ' ').slice(0, MAX_TEXT)

function toEvent(input) {
  const base = { at: Date.now(), session: input.session_id?.slice(0, 8) }
  const tool = input.tool_name
  const isAgentTool = tool === 'Agent' || tool === 'Task'
  switch (input.hook_event_name) {
    case 'UserPromptSubmit':
      return { ...base, type: 'demand', text: clip(input.prompt) }
    case 'PreToolUse':
      if (isAgentTool) {
        return { ...base, type: 'agentStart', role: input.tool_input?.subagent_type ?? 'general-purpose', text: clip(input.tool_input?.description) }
      }
      return { ...base, type: 'tool', role: input.agent_type ?? 'main', tool }
    case 'PostToolUse':
      if (isAgentTool) return { ...base, type: 'agentDone', role: input.tool_input?.subagent_type ?? 'general-purpose' }
      return null
    case 'Stop':
      return { ...base, type: 'idle' }
    default:
      return null
  }
}

let raw = ''
process.stdin.on('data', (chunk) => { raw += chunk })
process.stdin.on('end', () => {
  try {
    const event = toEvent(JSON.parse(raw))
    if (!event) return
    mkdirSync(dirname(LOG), { recursive: true })
    appendFileSync(LOG, JSON.stringify(event) + '\n')
  } catch {
    // Never block Claude because of the visualization.
  }
})
