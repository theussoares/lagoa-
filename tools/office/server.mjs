// Serves the 3D office and streams hook events over SSE.
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync, openSync, readSync, closeSync, watchFile } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const LOG = join(DIR, '.data', 'events.jsonl')
const PORT = Number(process.env.PORT ?? 4545)
const clients = new Set()
const TYPES = { js: 'text/javascript; charset=utf-8', glb: 'model/gltf-binary', png: 'image/png' }
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
  // Only known folders and extensions are served; the pattern has no '.' in the path, so nothing escapes the folder.
  const asset = /^\/(js|models)\/([\w/-]+)\.(js|glb|png)$/.exec((req.url ?? '').split('?')[0])
  if (asset) {
    const file = join(DIR, asset[1], `${asset[2]}.${asset[3]}`)
    if (!existsSync(file)) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'Content-Type': TYPES[asset[3]], 'Cache-Control': 'no-cache' })
    res.end(readFileSync(file))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
  res.end(readFileSync(join(DIR, 'index.html')))
}).listen(PORT, '127.0.0.1', () => console.log(`office on http://localhost:${PORT}`))
