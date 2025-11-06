import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { sheetsClient } from '../lib/sheets.js'
import { env } from './config/env.js'
import { purchasePrize, spinWheel } from '../lib/economy.js'
import type { Prize, WheelSetting, User, SpinLogEntry, DuckHistoryEntry } from '../lib/types.js'

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>

const asyncHandler =
  (handler: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
    handler(req, res, next).catch(next)

const requireAdmin: express.RequestHandler = (req, res, next) => {
  if (!env.authSecret) {
    next()
    return
  }
  const provided =
    (req.headers['x-auth-secret'] as string | undefined) ??
    (req.body?.authSecret as string | undefined) ??
    (req.query.authSecret as string | undefined)
  if (provided === env.authSecret) {
    next()
    return
  }
  res.status(401).json({ error: 'UNAUTHORIZED' })
}

interface SpinRequestBody {
  userId: string
  betLevel: string
  seed?: string
}

interface BuyRequestBody {
  userId: string
  prizeId: string
}

interface AdminPrizeBody {
  prize: Prize
}

interface AdminSettingBody {
  setting: WheelSetting
}

const validateSpinBody = (body: SpinRequestBody) => {
  if (!body?.userId || !body?.betLevel) {
    throw new Error('INVALID_INPUT')
  }
}

const validateBuyBody = (body: BuyRequestBody) => {
  if (!body?.userId || !body?.prizeId) {
    throw new Error('INVALID_INPUT')
  }
}

export const createApp = () => {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', appName: env.appName })
  })

  app.get(
    '/api/me',
    asyncHandler(async (req, res) => {
      const userId = String(req.query.userId ?? '')
      if (!userId) {
        res.status(400).json({ error: 'USER_ID_REQUIRED' })
        return
      }
      const user = await sheetsClient.getUserById(userId)
      if (!user) {
        res.status(404).json({ error: 'USER_NOT_FOUND' })
        return
      }
      res.json({ user, appName: env.appName })
    }),
  )

  app.get(
    '/api/prizes',
    asyncHandler(async (_req, res) => {
      const prizes = await sheetsClient.listPrizes()
      res.json({ prizes })
    }),
  )

  app.get(
    '/api/users-overview',
    asyncHandler(async (_req, res) => {
      const [users, logs] = await Promise.all([
        sheetsClient.listUsers(),
        sheetsClient.listSpinLogs(),
      ])

      const overview = users.map((user: User) => {
        const winsMap = new Map<
          string,
          {
            prizeId?: string
            prizeName: string
            rarity: number
            count: number
            lastWonAt: string
          }
        >()

        logs
          .filter((log: SpinLogEntry) => log.userId === user.userId && log.prizeName)
          .forEach((log: SpinLogEntry) => {
            const key = log.prizeId ?? `${log.prizeName}:${log.rarity}`
            const existing = winsMap.get(key)
            if (existing) {
              existing.count += 1
              if (new Date(log.createdAt).getTime() > new Date(existing.lastWonAt).getTime()) {
                existing.lastWonAt = log.createdAt
              }
            } else {
              winsMap.set(key, {
                prizeId: log.prizeId,
                prizeName: log.prizeName,
                rarity: log.rarity,
                count: 1,
                lastWonAt: log.createdAt,
              })
            }
          })

        const wins = Array.from(winsMap.values()).sort((a: { count: number; lastWonAt: string }, b: { count: number; lastWonAt: string }) => {
          if (b.count === a.count) {
            return new Date(b.lastWonAt).getTime() - new Date(a.lastWonAt).getTime()
          }
          return b.count - a.count
        })

        return {
          userId: user.userId,
          name: user.name,
          balance: user.balance,
          totalEarned: user.totalEarned,
          wins,
        }
      })

      overview.sort((a, b) => {
        if (b.balance === a.balance) {
          return a.name.localeCompare(b.name)
        }
        return b.balance - a.balance
      })

      res.json({ users: overview })
    }),
  )

  app.get(
    '/api/settings',
    asyncHandler(async (_req, res) => {
      const settings = await sheetsClient.listWheelSettings()
      res.json({ settings })
    }),
  )

  app.get(
    '/api/logs',
    asyncHandler(async (req, res) => {
      const userId = req.query.userId
        ? String(req.query.userId)
        : undefined
      const logs = await sheetsClient.listSpinLogs(userId)
      res.json({ logs })
    }),
  )

  app.get(
    '/api/orders',
    asyncHandler(async (req, res) => {
      const userId = req.query.userId
        ? String(req.query.userId)
        : undefined
      const orders = await sheetsClient.listShopOrders(userId)
      res.json({ orders })
    }),
  )

  app.get(
    '/api/duck-history',
    asyncHandler(async (req, res) => {
      const userId = req.query.userId
        ? String(req.query.userId)
        : undefined
      if (!userId) {
        res.status(400).json({ error: 'USER_ID_REQUIRED' })
        return
      }
      const history = await sheetsClient.listDuckHistory(userId)
      // Сортируем по дате создания (новые сверху)
      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      res.json({ history })
    }),
  )

  app.post(
    '/api/spin',
    asyncHandler(async (req, res) => {
      const body = req.body as SpinRequestBody
      validateSpinBody(body)
      const user = await sheetsClient.getUserById(body.userId)
      if (!user) {
        res.status(404).json({ error: 'USER_NOT_FOUND' })
        return
      }
      const settings = await sheetsClient.listWheelSettings()
      const level = settings[body.betLevel as keyof typeof settings]
      if (!level) {
        res.status(400).json({ error: 'LEVEL_NOT_FOUND' })
        return
      }
      const prizes = await sheetsClient.listPrizes()
      const { result, nextUser, logEntry } = spinWheel({
        user,
        level,
        prizes,
        seed: body.seed,
      })
      let updatedPrize = result.prize
      if (result.prize?.removeAfterWin && !result.prize.removedFromWheel) {
        const prizeToUpdate = prizes.find(
          (item: Prize) => item.prizeId === result.prize?.prizeId,
        )
        if (prizeToUpdate) {
          const savedPrize: Prize = {
            ...prizeToUpdate,
            removedFromWheel: true,
          }
          await sheetsClient.savePrize(savedPrize)
          updatedPrize = { ...result.prize, removedFromWheel: true }
        }
      }
      await sheetsClient.saveUser(nextUser)
      await sheetsClient.appendSpinLog(logEntry)
      res.json({
        result: updatedPrize
          ? { ...result, prize: updatedPrize }
          : result,
        user: nextUser,
      })
    }),
  )

  app.post(
    '/api/admin/add-ducks',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const { userId, amount, note } = req.body as {
        userId?: string
        amount?: number
        note?: string
      }
      if (!userId || typeof amount !== 'number' || !Number.isFinite(amount) || !note) {
        res.status(400).json({ error: 'INVALID_INPUT' })
        return
      }
      const user = await sheetsClient.getUserById(userId)
      if (!user) {
        res.status(404).json({ error: 'USER_NOT_FOUND' })
        return
      }
      const now = new Date().toISOString()
      const nextUser: User = {
        ...user,
        balance: user.balance + amount,
        totalEarned: (user.totalEarned ?? 0) + amount,
        updatedAt: now,
      }
      const entry: DuckHistoryEntry = {
        entryId: crypto.randomUUID(),
        userId: user.userId,
        amount,
        note,
        createdAt: now,
      }
      await sheetsClient.saveUser(nextUser)
      await sheetsClient.appendDuckHistory(entry)
      res.json({ user: nextUser, entry })
    }),
  )

  app.post(
    '/api/buy',
    asyncHandler(async (req, res) => {
      const body = req.body as BuyRequestBody
      validateBuyBody(body)
      const user = await sheetsClient.getUserById(body.userId)
      if (!user) {
        res.status(404).json({ error: 'USER_NOT_FOUND' })
        return
      }
      const prizes = await sheetsClient.listPrizes()
      const prize = prizes.find((item: Prize) => item.prizeId === body.prizeId)
      if (!prize) {
        res.status(404).json({ error: 'PRIZE_NOT_FOUND' })
        return
      }
      const { nextUser, order } = purchasePrize({ user, prize })
      if (prize.removeAfterWin && !prize.removedFromWheel) {
        const savedPrize: Prize = {
          ...prize,
          removedFromWheel: true,
        }
        await sheetsClient.savePrize(savedPrize)
      }
      await sheetsClient.saveUser(nextUser)
      await sheetsClient.appendShopOrder(order)
      res.json({ order, user: nextUser })
    }),
  )

  app.post(
    '/api/admin/prizes',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const body = req.body as AdminPrizeBody
      if (!body?.prize) {
        res.status(400).json({ error: 'INVALID_INPUT' })
        return
      }
      await sheetsClient.savePrize(body.prize)
      res.json({ success: true })
    }),
  )

  app.post(
    '/api/admin/settings',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const body = req.body as AdminSettingBody
      if (!body?.setting) {
        res.status(400).json({ error: 'INVALID_INPUT' })
        return
      }
      await sheetsClient.saveWheelSetting(body.setting)
      res.json({ success: true })
    }),
  )

  app.use(
    (error: Error, _req: Request, res: Response, next: NextFunction) => {
      void next
      console.error('[Server Error]', error.message)
      if (error.stack) {
        console.error('[Stack]', error.stack)
      }
      if (error.message === 'INSUFFICIENT_BALANCE') {
        res.status(400).json({ error: 'INSUFFICIENT_BALANCE' })
        return
      }
      if (error.message === 'INVALID_INPUT') {
        res.status(400).json({ error: 'INVALID_INPUT' })
        return
      }
      res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', details: error.message })
    },
  )

  return app
}
