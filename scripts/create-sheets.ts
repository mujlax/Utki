import { google } from 'googleapis'
import { env } from '../src/server/config/env.js'

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
} as const

type SheetName = keyof typeof SHEET_COLUMNS

async function createMissingSheets() {
  const auth = new google.auth.JWT({
    email: env.serviceAccountEmail,
    key: env.serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = env.spreadsheetId

  console.log('Checking existing sheets...')

  // Получаем список всех листов
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  })

  const existingSheets = new Set(
    spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) ?? [],
  )

  console.log('Existing sheets:', Array.from(existingSheets))

  const sheetsToCreate: Array<{ title: string; headers: readonly string[] }> = []

  // Проверяем каждый необходимый лист
  for (const [sheetName, headers] of Object.entries(SHEET_COLUMNS)) {
    if (!existingSheets.has(sheetName)) {
      console.log(`Sheet "${sheetName}" is missing, will be created`)
      sheetsToCreate.push({ title: sheetName, headers })
    } else {
      console.log(`Sheet "${sheetName}" exists`)
    }
  }

  if (sheetsToCreate.length === 0) {
    console.log('All required sheets already exist!')
    return
  }

  // Создаем недостающие листы
  console.log(`\nCreating ${sheetsToCreate.length} sheet(s)...`)

  const requests = sheetsToCreate.map(({ title }) => ({
    addSheet: {
      properties: {
        title,
      },
    },
  }))

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  })

  console.log('Sheets created successfully!')

  // Добавляем заголовки в созданные листы
  console.log('\nAdding headers to new sheets...')

  for (const { title, headers } of sheetsToCreate) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1:${String.fromCharCode(64 + headers.length)}1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers as string[]],
      },
    })
    console.log(`Headers added to "${title}"`)
  }

  console.log('\n✅ All sheets created and initialized successfully!')
}

createMissingSheets()
  .then(() => {
    console.log('Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to create sheets', error)
    process.exit(1)
  })

