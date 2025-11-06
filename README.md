# Колесо уточечной удачи

Полноценное веб-приложение для геймификации внутренней валюты «уточки». Сотрудники ставят уточки, чтобы крутить колесо с призами разных редкостей, ведём баланс и логи в Google Sheets, поддерживаем pity-механику и прямые покупки призов.

## Стек

- **Frontend:** React + TypeScript (Vite), Material UI, React Query, Zustand.
- **Backend:** Express + Google Sheets API (service account) с общей кодовой базой.
- **Тесты:** Vitest + React Testing Library (unit-тесты для RNG и игровой логики).
- **Дополнительно:** canvas-confetti для визуальных эффектов, tsup/tsx для сборки и скриптов.

## Быстрый старт

1. Склонируйте репозиторий и установите зависимости:

   ```bash
   npm install
   ```

2. Создайте сервисный аккаунт Google, откройте ему доступ на редактирование нужной таблицы и сохраните JSON-ключ. Spreadsheet должен содержать листы:

   - `Users`
   - `Prizes`
   - `WheelSettings`
   - `SpinLog`
   - `ShopOrders`

   Колонки для каждого листа описаны в разделе [Структура Google Sheets](#структура-google-sheets).

3. Скопируйте `.env.example` (см. ниже) в `.env.local` и заполните переменные:

   ```dotenv
   GOOGLE_SHEETS_SPREADSHEET_ID=1AbCdEf...
   GOOGLE_SERVICE_ACCOUNT_EMAIL=wheel-service@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
   AUTH_SECRET=super-ducks-secret
   NEXT_PUBLIC_APP_NAME="Колесо уточечной удачи"
   ```

   > Ключ можно хранить как plain text (с `\n`) или в base64 — приложение корректно распарсит оба формата. Альтернатива: положите JSON-файл сервисного аккаунта (например, `actual_credentials.json`, файл уже добавлен в `.gitignore`) и задайте `GOOGLE_APPLICATION_CREDENTIALS=./actual_credentials.json`. В этом случае e-mail/ключ будут подтянуты автоматически.

4. Заполните таблицу тестовыми данными:

   ```bash
   npm run seed
   ```

5. Запустите фронтенд и бэкенд в режиме разработки:

   ```bash
   npm run dev         # Vite на http://localhost:5173
   npm run dev:server  # Express API на http://localhost:4000
   ```

   Или одновременно:

   ```bash
   npm run dev:full
   ```

6. Откройте `http://localhost:5173`, введите `duck-admin` или другого демо-пользователя и тестируйте.

## Скрипты

| Команда               | Описание |
| --------------------- | -------- |
| `npm run dev`         | Запуск Vite-фронтенда с HMR |
| `npm run dev:server`  | Старт Express API (`PORT` по умолчанию 4000) |
| `npm run dev:full`    | Оба сервера параллельно (через `concurrently`) |
| `npm run build`       | Сборка фронта + бандл сервера (`dist/`) |
| `npm run start:server`| Запуск собранного API (`node dist/server/index.js`) |
| `npm run lint`        | ESLint для всех `.ts/.tsx` файлов |
| `npm run test`        | Vitest (unit-тесты RNG и игровой логики) |
| `npm run seed`        | Первичное наполнение Google Sheets демо-данными |

## API (Express, `src/server/app.ts`)

| Метод | URL                   | Описание |
| ----- | --------------------- | -------- |
| `GET` | `/api/health`         | Пинг сервера |
| `GET` | `/api/me?userId=`     | Профиль пользователя + имя приложения |
| `GET` | `/api/prizes`         | Активные и скрытые призы |
| `GET` | `/api/settings`       | Настройки уровней колеса |
| `GET` | `/api/logs`           | История круток (фильтр `userId`) |
| `GET` | `/api/orders`         | Заказы из магазина (фильтр `userId`) |
| `POST`| `/api/spin`           | Совершить крутку (`{ userId, betLevel }`) |
| `POST`| `/api/buy`            | Купить приз напрямую (`{ userId, prizeId }`) |
| `POST`| `/api/admin/prizes`   | CRUD призов (auth: `x-auth-secret`) |
| `POST`| `/api/admin/settings` | Обновление настроек уровней (auth) |

Pity-механика и расчёт весов реализованы в `src/lib/economy.ts`, генератор псевдо-рандома с сидом — в `src/lib/rng.ts`. Вероятность и ширина сектора завязаны исключительно на редкости: базовые коэффициенты (определённые для каждой редкости) модифицируются уровнями колеса и удачей пользователя, индивидуальные веса для призов не используются.

## Структура Google Sheets

### Лист `Users`

| Колонка          | Тип                                  |
| ---------------- | ------------------------------------ |
| `userId`         | string (уникальный)                  |
| `name`           | string                               |
| `balance`        | number (уточки)                      |
| `spinsTotal`     | number                               |
| `lastResult`     | string                               |
| `luckModifier`   | number (0…1, прибавка к шансам)      |
| `role`           | `user` \| `admin`                    |
| `updatedAt`      | ISO8601                              |

### Лист `Prizes`

| Колонка            | Тип                                       |
| ------------------ | ----------------------------------------- |
| `prizeId`          | string (уникальный)                       |
| `name`             | string                                    |
| `description`      | string                                    |
| `rarity`           | 1–4 (Обычный → Легендарный)               |
| `baseWeight`       | number (базовый вес)                      |
| `directBuyEnabled` | TRUE/FALSE                                |
| `directBuyPrice`   | number или пусто                          |
| `active`           | TRUE/FALSE                                |

### Лист `WheelSettings`

| Колонка            | Тип / пример                                                                   |
| ------------------ | ------------------------------------------------------------------------------ |
| `level`            | `basic` \| `advanced` \| `epic` \| `legendary`                                   |
| `spinCost`         | number                                                                         |
| `rarityUpgrades`   | JSON `{"1":2,"2":2,"3":3,"4":4}`                                                |
| `pityStep`         | number (увеличение luck за «мелкий» приз)                                      |
| `pityMax`          | number (максимальное значение luck)                                            |
| `weightsOverrides` | JSON `{ "1":0.5,"2":1.2 }`                                                      |
| `seriesBonusEvery` | number (через сколько круток бонус)                                            |
| `seriesBonusType`  | `freeSpin`, `+luck` или пусто                                                  |

### Лист `SpinLog`

| Колонка              | Тип    |
| -------------------- | ------ |
| `logId`              | string |
| `userId`             | string |
| `betLevel`           | string |
| `prizeId`            | string или пусто |
| `prizeName`          | string |
| `rarity`             | number |
| `balanceBefore/After`| number |
| `luckModifierBefore/After` | number |
| `createdAt`          | ISO8601 |

### Лист `ShopOrders`

| Колонка   | Тип                              |
| --------- | -------------------------------- |
| `orderId` | string                           |
| `userId`  | string                           |
| `prizeId` | string                           |
| `price`   | number                           |
| `status`  | `created` \| `approved` \| `delivered` |
| `createdAt`, `updatedAt` | ISO8601           |

## Разработка и тестирование

- **Юнит-тесты**: `npm test` проверяет детерминированность RNG и игровую экономику (pity, покупки).
- **Линтер**: `npm run lint` охватывает фронт и сервер.
- **TypeScript**: `npm run build` вызывает `tsc -b` + `vite build` + `tsup` для сервера.

Перед коммитом рекомендуется запускать `npm test` и `npm run lint`, чтобы поймать ошибки в логике или типах.

## Деплой

### Вариант 1: Render (рекомендуется)

1. Создайте сервис **Web Service** на Render:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start:server`
   - Node 20+
   - В переменные окружения добавьте блок из `.env`.
2. Приложение будет обслуживать и API, и статический фронтенд (Vite билд лежит в `dist/` и раздаётся Express'ом).

### Вариант 2: Vercel + Render / Railway

1. Бэкенд (Express) разместите на Render/Railway (`npm run build` + `npm run start:server`).
2. Фронтенд деплойте на Vercel/Netlify:
   - Build command: `npm run build`
   - Output directory: `dist`
   - В переменных окружения добавьте `VITE_API_BASE_URL=https://your-backend.example.com`.

### Авторизация администратора

Админский UI виден только пользователям с ролью `admin`. Чтобы отправлять изменения в Google Sheets, нужно ввести `AUTH_SECRET` в поле «Админ-панель» — он шлётся в заголовке `x-auth-secret`.

## Архитектура проекта

```
src/
├─ api/                 # Fetch-клиент и типы ответов
├─ components/          # UI-компоненты (Wheel, SpinPanel, Shop, Admin)
├─ store/               # Zustand-хранилище для userId / authSecret
├─ lib/
│  ├─ economy.ts        # Игровая логика, pity, прямые покупки
│  ├─ rng.ts            # Детерминированный генератор случайных чисел
│  ├─ sheets.ts         # Клиент Google Sheets (используется сервером и seed-скриптом)
│  ├─ types.ts          # Общие типы домена
│  └─ validation.ts     # Zod-схемы для данных из таблиц
└─ server/
   ├─ app.ts            # Express API
   └─ config/env.ts     # Парсинг переменных окружения

scripts/
└─ dev-seed.ts          # Первичное наполнение Google Sheets
```

## Дополнительно

- Колесо визуализировано на `canvas-confetti` и `conic-gradient`, отображает активные призы и запускает анимацию при каждой крутке.
- React Query управляет данными пользователя, призов, заказов и логов; Zustand хранит `userId` и админский секрет с локальным кешированием.
- `SpinPanel` описывает уровни ставок, `SpinHistory` показывает логи и заказы, админский раздел позволяет редактировать JSON-данные прямо из UI.

Если нужно расширять проект (например, добавлять email-уведомления или OAuth), рекомендуется вынести доступ к Google Sheets в отдельный слой и внедрить очередь для долгих операций.
