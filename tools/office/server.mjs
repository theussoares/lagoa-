// Serves the 3D office and streams hook events over SSE.
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync, openSync, readSync, closeSync, watchFile } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const LOG = join(DIR, '.data', 'events.jsonl')
const PORT = Number(process.env.PORT ?? 4545)
const clients = new Set()
let offset = existsSync(LOG) ? statSync(LOG).size : 0

function readNewLines() {
  if (!existsSync(LOG)) return []
  const size = statSync(LOG).size
  if (size < offset) offset = 0
  if (size === offset) return []
  const buffer = Buffer.alloc(size - offset)
  const fd = openSync(LOG, 'r')
  readSync(fd, buffer, 0, buffer.length, offset)
  closeSync(fd)
  offset = size
  return buffer.toString('utf8').split('\n').filter(Boolean)
}

watchFile(LOG, { interval: 300 }, () => {
  for (const line of readNewLines()) for (const res of clients) res.write(`data: ${line}\n\n`)
})

createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    res.write(': hi\n\n')
    clients.add(res)
    req.on('close', () => clients.delete(res))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(readFileSync(join(DIR, 'index.html')))
}).listen(PORT, '127.0.0.1', () => console.log(`office on http://localhost:${PORT}`))
