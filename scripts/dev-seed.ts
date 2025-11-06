import { v4 as uuid } from 'uuid'
import { sheetsClient } from '../src/lib/sheets.js'
import type { Prize, User, WheelSetting } from '../src/lib/types.js'

const nowIso = () => new Date().toISOString()

const demoUsers: User[] = [
  {
    userId: 'duck-admin',
    name: 'Администратор',
    balance: 120,
    totalEarned: 120,
    spinsTotal: 0,
    lastResult: '—',
    luckModifier: 0,
    role: 'admin',
    updatedAt: nowIso(),
  },
  {
    userId: 'duck-alex',
    name: 'Александр',
    balance: 80,
    totalEarned: 80,
    spinsTotal: 3,
    lastResult: 'Фирменные стикеры',
    luckModifier: 0.1,
    role: 'user',
    updatedAt: nowIso(),
  },
  {
    userId: 'duck-maria',
    name: 'Мария',
    balance: 45,
    totalEarned: 45,
    spinsTotal: 9,
    lastResult: 'Плюшевая уточка',
    luckModifier: 0.2,
    role: 'user',
    updatedAt: nowIso(),
  },
]

const demoPrizes: Prize[] = [
  {
    prizeId: 'prize-stickers',
    name: 'Фирменные стикеры',
    description: 'Набор наклеек с уточками',
    rarity: 1,
    baseWeight: 60,
    directBuyEnabled: true,
    directBuyPrice: 10,
    active: true,
  },
  {
    prizeId: 'prize-coffee',
    name: 'Кофе с баристой',
    description: 'Сертификат на напиток в офисе',
    rarity: 1,
    baseWeight: 40,
    directBuyEnabled: false,
    active: true,
  },
  {
    prizeId: 'prize-merch',
    name: 'Футболка с уточкой',
    description: 'Ограниченный мерч команды',
    rarity: 2,
    baseWeight: 20,
    directBuyEnabled: true,
    directBuyPrice: 45,
    active: true,
  },
  {
    prizeId: 'prize-dayoff',
    name: 'Полдня отпуска',
    description: 'Бонусный отдых за детерминированную удачу',
    rarity: 3,
    baseWeight: 5,
    directBuyEnabled: false,
    active: true,
  },
  {
    prizeId: 'prize-retreat',
    name: 'Уикенд на базе',
    description: 'Легендарная награда для самых удачливых',
    rarity: 4,
    baseWeight: 1,
    directBuyEnabled: false,
    active: true,
  },
]

const demoSettings: WheelSetting[] = [
  {
    level: 'basic',
    spinCost: 3,
    rarityUpgrades: { 1: 1, 2: 2, 3: 3, 4: 4 },
    pityStep: 0.05,
    pityMax: 0.25,
    seriesBonusEvery: 6,
    seriesBonusType: '+luck',
  },
  {
    level: 'advanced',
    spinCost: 7,
    rarityUpgrades: { 1: 2, 2: 2, 3: 3, 4: 4 },
    pityStep: 0.07,
    pityMax: 0.35,
    seriesBonusEvery: 5,
    seriesBonusType: '+luck',
  },
  {
    level: 'epic',
    spinCost: 15,
    rarityUpgrades: { 1: 2, 2: 3, 3: 3, 4: 4 },
    pityStep: 0.1,
    pityMax: 0.5,
    seriesBonusEvery: 4,
    seriesBonusType: 'freeSpin',
  },
  {
    level: 'legendary',
    spinCost: 25,
    rarityUpgrades: { 1: 2, 2: 3, 3: 4, 4: 4 },
    pityStep: 0.12,
    pityMax: 0.6,
    seriesBonusEvery: 5,
    seriesBonusType: 'freeSpin',
  },
]

const seedUsers = async () => {
  const existing = await sheetsClient.listUsers()
  if (existing.length > 0) {
    console.log(`Users already seeded (${existing.length})`)
    return
  }
  await Promise.all(demoUsers.map((user) => sheetsClient.saveUser(user)))
  console.log(`Seeded ${demoUsers.length} users`)
}

const seedPrizes = async () => {
  const existing = await sheetsClient.listPrizes()
  if (existing.length > 0) {
    console.log(`Prizes already seeded (${existing.length})`)
    return
  }
  await Promise.all(demoPrizes.map((prize) => sheetsClient.savePrize(prize)))
  console.log(`Seeded ${demoPrizes.length} prizes`)
}

const seedSettings = async () => {
  const existing = await sheetsClient.listWheelSettings()
  if (Object.keys(existing).length > 0) {
    console.log(`Wheel settings already seeded (${Object.keys(existing).length})`)
    return
  }
  await Promise.all(demoSettings.map((setting) => sheetsClient.saveWheelSetting(setting)))
  console.log('Seeded wheel settings')
}

const seedLogs = async () => {
  const user = demoUsers[1]
  const prize = demoPrizes[0]
  await sheetsClient.appendSpinLog({
    logId: uuid(),
    userId: user.userId,
    betLevel: 'basic',
    prizeId: prize.prizeId,
    prizeName: prize.name,
    rarity: prize.rarity,
    balanceBefore: 80,
    balanceAfter: 77,
    luckModifierBefore: 0,
    luckModifierAfter: 0.05,
    createdAt: nowIso(),
  })
  console.log('Added sample spin log entry')
}

const main = async () => {
  await seedUsers()
  await seedPrizes()
  await seedSettings()
  await seedLogs()
}

main()
  .then(() => {
    console.log('Seeding completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to seed spreadsheet', error)
    process.exit(1)
  })
