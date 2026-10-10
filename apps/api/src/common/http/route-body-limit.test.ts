import express, { json } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { largeJsonParsers } from './route-body-limit'

/** Mesma ordem do `createApp`: parsers por rota primeiro, depois o parser global padrão (100 kB). */
function appLikeNest(): express.Express {
  const app = express()
  for (const { path, handler } of largeJsonParsers()) app.use(path, handler)
  app.use(json())
  app.post('/v1/merchant/shop/photo', (req, res) => res.json({ size: String(req.body.dataBase64).length }))
  app.post('/v1/auth/otp', (req, res) => res.json({ size: JSON.stringify(req.body).length }))
  return app
}

const body = (bytes: number) => ({ contentType: 'image/webp', dataBase64: 'A'.repeat(bytes) })

describe('largeJsonParsers', () => {
  it('lets a ~500 kB photo through on the photo route', async () => {
    const response = await request(appLikeNest()).post('/v1/merchant/shop/photo').send(body(500_000)).expect(200)
    expect(response.body.size).toBe(500_000)
  })

  it('keeps the default limit everywhere else, including public routes', async () => {
    await request(appLikeNest()).post('/v1/auth/otp').send(body(500_000)).expect(413)
  })

  it('still refuses more than the photo limit', async () => {
    await request(appLikeNest()).post('/v1/merchant/shop/photo').send(body(2_200_000)).expect(413)
  })
})
