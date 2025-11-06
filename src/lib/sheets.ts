import { google, type sheets_v4 } from 'googleapis'
import type { z } from 'zod'
import { sheetSchemas } from './validation.js'
import type {
  Prize,
  ShopOrder,
  SpinLogEntry,
  User,
  WheelSetting,
  WheelSettingsMap,
  DuckHistoryEntry,
} from './types.js'
import { env } from '../server/config/env.js'

type SheetName = keyof typeof sheetSchemas

const SHEET_COLUMNS = {
  Users: [
    'userId',
    'name',
    'balance',
    'totalEarned',
    'spinsTotal',
    'lastResult',
    'luckModifier',
    'role',
    'updatedAt',
  ],
  Prizes: [
    'prizeId',
    'name',
    'description',
    'rarity',
    'baseWeight',
    'directBuyEnabled',
    'directBuyPrice',
    'active',
    'removeAfterWin',
    'removedFromWheel',
  ],
  WheelSettings: [
    'level',
    'spinCost',
    'rarityUpgrades',
    'pityStep',
    'pityMax',
    'seriesBonusEvery',
    'seriesBonusType',
  ],
  SpinLog: [
    'logId',
    'userId',
    'betLevel',
    'prizeId',
    'prizeName',
    'rarity',
    'balanceBefore',
    'balanceAfter',
    'luckModifierBefore',
    'luckModifierAfter',
    'createdAt',
  ],
  ShopOrders: [
    'orderId',
    'userId',
    'prizeId',
    'price',
    'status',
    'createdAt',
    'updatedAt',
  ],
  DuckHistory: [
    'entryId',
    'userId',
    'amount',
    'note',
    'createdAt',
  ],
} as const satisfies Record<SheetName, string[]>

type SheetColumns<N extends SheetName> = (typeof SHEET_COLUMNS)[N]
type SheetRow<N extends SheetName> = Record<SheetColumns<N>[number], string>

interface SheetRecord<N extends SheetName, T> {
  raw: SheetRow<N>
  parsed: T
  rowNumber: number
}

const rangeForSheet = (sheet: SheetName, columns: number) => {
  const start = 'A'
  const endCharCode = 'A'.charCodeAt(0) + columns - 1
  const end = String.fromCharCode(endCharCode)
  return `${String(sheet)}!${start}:${end}`
}

const rangeForRow = (sheet: SheetName, columns: number, row: number) => {
  const endCharCode = 'A'.charCodeAt(0) + columns - 1
  const end = String.fromCharCode(endCharCode)
  return `${String(sheet)}!A${row}:${end}${row}`
}

const serializeBoolean = (value: boolean) => (value ? 'TRUE' : 'FALSE')

const serializeUser = (user: User) => [
  user.userId,
  user.name,
  String(user.balance),
  String(user.totalEarned),
  String(user.spinsTotal),
  user.lastResult ?? '',
  user.luckModifier.toString(),
  user.role,
  user.updatedAt,
]

const serializePrize = (prize: Prize) => [
  prize.prizeId,
  prize.name,
  prize.description,
  String(prize.rarity),
  prize.baseWeight.toString(),
  serializeBoolean(prize.directBuyEnabled),
  prize.directBuyPrice !== undefined ? prize.directBuyPrice.toString() : '',
  serializeBoolean(prize.active),
  serializeBoolean(prize.removeAfterWin ?? false),
  serializeBoolean(prize.removedFromWheel ?? false),
]

const serializeWheelSetting = (setting: WheelSetting) => [
  setting.level,
  setting.spinCost.toString(),
  JSON.stringify(setting.rarityUpgrades),
  setting.pityStep.toString(),
  setting.pityMax.toString(),
  setting.seriesBonusEvery.toString(),
  setting.seriesBonusType ?? '',
]

const serializeSpinLog = (log: SpinLogEntry) => [
  log.logId,
  log.userId,
  log.betLevel,
  log.prizeId ?? '',
  log.prizeName,
  log.rarity.toString(),
  log.balanceBefore.toString(),
  log.balanceAfter.toString(),
  log.luckModifierBefore.toString(),
  log.luckModifierAfter.toString(),
  log.createdAt,
]

const serializeShopOrder = (order: ShopOrder) => [
  order.orderId,
  order.userId,
  order.prizeId,
  order.price.toString(),
  order.status,
  order.createdAt,
  order.updatedAt,
]

const serializeDuckHistory = (entry: DuckHistoryEntry) => [
  entry.entryId,
  entry.userId,
  entry.amount.toString(),
  entry.note,
  entry.createdAt,
]

const serializerMap: Record<SheetName, (value: unknown) => string[]> = {
  Users: (value) => serializeUser(value as User),
  Prizes: (value) => serializePrize(value as Prize),
  WheelSettings: (value) => serializeWheelSetting(value as WheelSetting),
  SpinLog: (value) => serializeSpinLog(value as SpinLogEntry),
  ShopOrders: (value) => serializeShopOrder(value as ShopOrder),
  DuckHistory: (value) => serializeDuckHistory(value as DuckHistoryEntry),
}

export class SheetsClient {
  private sheets: sheets_v4.Sheets
  private readonly spreadsheetId: string

  private constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId
    const auth = new google.auth.JWT({
      email: env.serviceAccountEmail,
      key: env.serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    this.sheets = google.sheets({ version: 'v4', auth })
  }

  private static instance: SheetsClient | null = null

  static getInstance(): SheetsClient {
    if (!SheetsClient.instance) {
      SheetsClient.instance = new SheetsClient(env.spreadsheetId)
    }
    return SheetsClient.instance
  }

  private async readSheet<N extends SheetName, T>(
    sheet: N,
  ): Promise<Array<SheetRecord<N, T>>> {
    const sheetColumns = SHEET_COLUMNS[sheet] as readonly string[]
    // Читаем больше колонок, чтобы захватить все возможные (до Z, что дает 26 колонок)
    const maxColumns = Math.max(sheetColumns.length, 26)
    const range = rangeForSheet(sheet, maxColumns)
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    })
    const values = data.values ?? []
    if (values.length === 0) {
      return []
    }
    
    // Читаем заголовки из первой строки
    const headerRow = values[0] as string[]
    const columnIndexMap = new Map<string, number>()
    headerRow.forEach((header, index) => {
      const normalizedHeader = header.trim().toLowerCase().replace(/\s+/g, '')
      columnIndexMap.set(normalizedHeader, index)
    })
    
    // Создаем маппинг ожидаемых колонок на индексы в таблице
    const expectedColumnIndices = new Map<string, number>()
    const missingColumns: string[] = []
    sheetColumns.forEach((expectedColumn) => {
      const normalizedExpected = expectedColumn.trim().toLowerCase().replace(/\s+/g, '')
      const index = columnIndexMap.get(normalizedExpected)
      if (index !== undefined) {
        expectedColumnIndices.set(expectedColumn, index)
      } else {
        missingColumns.push(expectedColumn)
      }
    })
    
    if (missingColumns.length > 0 && sheet === 'Users') {
      console.warn(`Missing columns in sheet ${sheet}:`, missingColumns)
      console.warn('Available headers:', headerRow)
      console.warn('Column mapping:', Array.from(expectedColumnIndices.entries()).map(([col, idx]) => `${col} -> ${headerRow[idx]}`))
    }
    
    const rows = values.slice(1) as string[][]
    const schema = sheetSchemas[sheet] as unknown as z.ZodSchema<T>
    const records: Array<SheetRecord<N, T>> = rows.map((row, index) => {
      const rawRow = {} as SheetRow<N>
      sheetColumns.forEach((column: string) => {
        const columnIndex = expectedColumnIndices.get(column)
        const value = columnIndex !== undefined ? row[columnIndex] : undefined
        rawRow[column as SheetColumns<N>[number]] = value === undefined || value === null ? '' : String(value)
      })
      const parseResult = schema.safeParse(rawRow)
      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors.map((err) => {
          const field = err.path.join('.')
          const value = err.path.reduce((obj: any, key) => obj?.[key], rawRow)
          return `Field "${field}": ${err.message} (value: "${value}")`
        })
        console.error(`Error parsing row ${index + 2} in sheet ${sheet}:`)
        console.error('Validation errors:', errorDetails)
        console.error('Raw row:', rawRow)
        console.error('Expected columns:', sheetColumns)
        console.error('Header row:', headerRow)
        console.error('Column mapping:', Array.from(expectedColumnIndices.entries()).map(([col, idx]) => `${col} -> index ${idx} (${headerRow[idx]})`))
        console.error('Full row data:', row)
        throw new Error(`Validation failed for row ${index + 2}: ${errorDetails.join('; ')}`)
      }
      return {
        raw: rawRow,
        parsed: parseResult.data,
        rowNumber: index + 2,
      }
    })
    return records
  }

  private async writeRow<N extends SheetName>(
    sheet: N,
    rowNumber: number,
    value: unknown,
  ) {
    const sheetColumns = SHEET_COLUMNS[sheet] as readonly string[]
    const range = rangeForRow(sheet, sheetColumns.length, rowNumber)
    const values = [serializerMap[sheet](value)]
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    })
  }

  private async appendRow<N extends SheetName>(sheet: N, value: unknown) {
    const sheetColumns = SHEET_COLUMNS[sheet] as readonly string[]
    const range = rangeForSheet(sheet, sheetColumns.length)
    const values = [serializerMap[sheet](value)]
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    })
  }

  async listUsers(): Promise<User[]> {
    const rows = await this.readSheet<'Users', User>('Users')
    return rows.map((row) => row.parsed)
  }

  async getUserById(userId: string): Promise<User | null> {
    const rows = await this.readSheet<'Users', User>('Users')
    const match = rows.find((row) => row.parsed.userId === userId)
    return match?.parsed ?? null
  }

  async saveUser(user: User) {
    const rows = await this.readSheet<'Users', User>('Users')
    const existing = rows.find((row) => row.parsed.userId === user.userId)
    if (existing) {
      await this.writeRow('Users', existing.rowNumber, user)
    } else {
      await this.appendRow('Users', user)
    }
  }

  async appendDuckHistory(entry: DuckHistoryEntry) {
    await this.appendRow('DuckHistory', entry)
  }

  async listDuckHistory(userId?: string): Promise<DuckHistoryEntry[]> {
    const rows = await this.readSheet<'DuckHistory', DuckHistoryEntry>('DuckHistory')
    const all = rows.map((r) => r.parsed)
    return userId ? all.filter((e) => e.userId === userId) : all
  }

  async listPrizes(): Promise<Prize[]> {
    const rows = await this.readSheet<'Prizes', Prize>('Prizes')
    return rows.map((row) => row.parsed)
  }

  async savePrize(prize: Prize) {
    const rows = await this.readSheet<'Prizes', Prize>('Prizes')
    const existing = rows.find((row) => row.parsed.prizeId === prize.prizeId)
    if (existing) {
      await this.writeRow('Prizes', existing.rowNumber, prize)
    } else {
      await this.appendRow('Prizes', prize)
    }
  }

  async listWheelSettings(): Promise<WheelSettingsMap> {
    const rows = await this.readSheet<'WheelSettings', WheelSetting>(
      'WheelSettings',
    )
    return rows.reduce<WheelSettingsMap>((acc, row) => {
      acc[row.parsed.level] = row.parsed
      return acc
    }, {} as WheelSettingsMap)
  }

  async saveWheelSetting(setting: WheelSetting) {
    const rows = await this.readSheet<'WheelSettings', WheelSetting>(
      'WheelSettings',
    )
    const existing = rows.find((row) => row.parsed.level === setting.level)
    if (existing) {
      await this.writeRow('WheelSettings', existing.rowNumber, setting)
    } else {
      await this.appendRow('WheelSettings', setting)
    }
  }

  async appendSpinLog(entry: SpinLogEntry) {
    await this.appendRow('SpinLog', entry)
  }

  async listSpinLogs(userId?: string): Promise<SpinLogEntry[]> {
    const rows = await this.readSheet<'SpinLog', SpinLogEntry>('SpinLog')
    return rows
      .map((row) => row.parsed)
      .filter((entry) => (userId ? entry.userId === userId : true))
  }

  async appendShopOrder(order: ShopOrder) {
    await this.appendRow('ShopOrders', order)
  }

  async listShopOrders(userId?: string): Promise<ShopOrder[]> {
    const rows = await this.readSheet<'ShopOrders', ShopOrder>('ShopOrders')
    return rows
      .map((row) => row.parsed)
      .filter((order) => (userId ? order.userId === userId : true))
  }

  async updateShopOrderStatus(order: ShopOrder) {
    const rows = await this.readSheet<'ShopOrders', ShopOrder>('ShopOrders')
    const existing = rows.find((row) => row.parsed.orderId === order.orderId)
    if (!existing) {
      throw new Error(`Order ${order.orderId} not found`)
    }
    await this.writeRow('ShopOrders', existing.rowNumber, order)
  }
}

export const sheetsClient = SheetsClient.getInstance()
