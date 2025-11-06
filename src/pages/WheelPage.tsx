import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { apiClient } from '../api/client'
import { BalanceCard } from '../components/BalanceCard'
import { SpinPanel } from '../components/SpinPanel'
import { Wheel } from '../components/Wheel'
import { PrizeGrid } from '../components/PrizeGrid'
import { SpinHistory } from '../components/SpinHistory'
import { AdminPanel } from '../components/Admin/AdminPanel'
import { ThemeToggle } from '../components/ThemeToggle'
import { useUserStore } from '../store/userStore'
import type {
  Prize,
  SpinResult,
  WheelLevelKey,
  WheelSetting,
  WheelSettingsMap,
  User,
} from '../lib/types'
import { calculatePrizeWeights, RARITY_BASE_WEIGHTS } from '../lib/economy'

const levelsOrder: WheelLevelKey[] = ['basic', 'advanced', 'epic']

const WheelPage = () => {
  const queryClient = useQueryClient()
  const { userId, setUserId, authSecret } = useUserStore()
  const [userIdInput, setUserIdInput] = useState(userId ?? '')
  const [pendingResult, setPendingResult] = useState<SpinResult | null>(null)
  const [revealedResult, setRevealedResult] = useState<SpinResult | null>(null)
  const [isSpinInProgress, setIsSpinInProgress] = useState(false)
  const [isWaitingForResult, setIsWaitingForResult] = useState(false)
  const [pendingUserUpdate, setPendingUserUpdate] = useState<User | null>(null)
  const [pendingSnackbarMessage, setPendingSnackbarMessage] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<WheelLevelKey>('basic')
  const [appName, setAppName] = useState('Колесо уточечной удачи')
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  )
  const pendingResultRef = useRef<SpinResult | null>(null)

  useEffect(() => {
    pendingResultRef.current = pendingResult
  }, [pendingResult])

  useEffect(() => {
    const storedUser = localStorage.getItem('utki:userId')
    if (storedUser) {
      setUserId(storedUser)
      setUserIdInput(storedUser)
    }
    const storedSecret = localStorage.getItem('utki:authSecret')
    if (storedSecret) {
      useUserStore.setState({ authSecret: storedSecret })
    }
  }, [setUserId])

  useEffect(() => {
    if (userId) {
      localStorage.setItem('utki:userId', userId)
    } else {
      localStorage.removeItem('utki:userId')
    }
  }, [userId])

  useEffect(() => {
    if (authSecret) {
      localStorage.setItem('utki:authSecret', authSecret)
    } else {
      localStorage.removeItem('utki:authSecret')
    }
  }, [authSecret])

  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => apiClient.getMe(userId!),
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
  })

  useEffect(() => {
    if (userQuery.data?.appName) {
      setAppName(userQuery.data.appName)
    }
  }, [userQuery.data?.appName])

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: apiClient.getSettings,
    enabled: !!userId,
    staleTime: 60_000,
  })

  const prizesQuery = useQuery({
    queryKey: ['prizes'],
    queryFn: apiClient.getPrizes,
    enabled: !!userId,
  })

  const logsQuery = useQuery({
    queryKey: ['logs', userId],
    queryFn: () => apiClient.getLogs(userId ?? undefined),
    enabled: !!userId,
  })

  const ordersQuery = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => apiClient.getOrders(userId ?? undefined),
    enabled: !!userId,
  })

  const spinMutation = useMutation({
    mutationFn: (payload: { userId: string; betLevel: WheelLevelKey }) =>
      apiClient.spin(payload),
    onSuccess: (data) => {
      setPendingResult(data.result)
      setPendingUserUpdate(data.user)
      setPendingSnackbarMessage(
        data.result.prize
          ? `Выпал приз "${data.result.prize.name}" (редкость ${data.result.rarity})`
          : 'Крутка завершена',
      )
      setIsWaitingForResult(false)
    },
    onError: (error: Error) => {
      setSnackbar({ message: error.message, severity: 'error' })
      setPendingResult(null)
      setRevealedResult(null)
      setPendingUserUpdate(null)
      setPendingSnackbarMessage(null)
      setIsWaitingForResult(false)
      setIsSpinInProgress(false)
    },
  })

  const buyMutation = useMutation({
    mutationFn: (payload: { userId: string; prizeId: string }) => apiClient.buyPrize(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['user', userId], { user: data.user, appName })
      queryClient.invalidateQueries({ queryKey: ['orders', userId] })
      queryClient.invalidateQueries({ queryKey: ['prizes'] })
      setSnackbar({
        message: `Заказ на "${data.order.prizeId}" оформлен`,
        severity: 'success',
      })
    },
    onError: (error: Error) => setSnackbar({ message: error.message, severity: 'error' }),
  })

  const adminPrizeMutation = useMutation({
    mutationFn: (prize: Prize) =>
      apiClient.savePrize({ prize, authSecret: useUserStore.getState().authSecret ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prizes'] })
      setSnackbar({ message: 'Приз обновлен', severity: 'success' })
    },
    onError: (error: Error) => setSnackbar({ message: error.message, severity: 'error' }),
  })

  const adminSettingMutation = useMutation({
    mutationFn: (setting: WheelSetting) =>
      apiClient.saveSetting({
        setting,
        authSecret: useUserStore.getState().authSecret ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSnackbar({ message: 'Настройка обновлена', severity: 'success' })
    },
    onError: (error: Error) => setSnackbar({ message: error.message, severity: 'error' }),
  })

  const settingsMap: WheelSettingsMap | undefined = settingsQuery.data?.settings
  const orderedLevels = useMemo(() => {
    if (!settingsMap) return []
    return levelsOrder
      .map((level) => settingsMap[level])
      .filter((setting): setting is WheelSetting => Boolean(setting))
  }, [settingsMap])

  useEffect(() => {
    if (!orderedLevels.length) return
    if (!orderedLevels.some((level) => level.level === selectedLevel)) {
      setSelectedLevel(orderedLevels[0].level)
    }
  }, [orderedLevels, selectedLevel])

  const isLoading = userQuery.isPending || settingsQuery.isPending || prizesQuery.isPending

  const prizes = useMemo(
    () => prizesQuery.data?.prizes ?? [],
    [prizesQuery.data?.prizes],
  )
  const user = userQuery.data?.user ?? null
  const logs = logsQuery.data?.logs ?? []
  const orders = ordersQuery.data?.orders ?? []

  const isAdminView = user?.role === 'admin'
  const selectedSetting = settingsMap?.[selectedLevel]

  const availablePrizes = useMemo(
    () => prizes.filter((prize) => prize.active),
    [prizes],
  )

  const displayPrizes = useMemo(
    () =>
      prizes.filter(
        (prize) =>
          prize.active || (prize.removeAfterWin && prize.removedFromWheel),
      ),
    [prizes],
  )

  const sortedDisplayPrizes = useMemo(() => {
    const copy = [...displayPrizes]
    copy.sort((a, b) => {
      if (b.rarity !== a.rarity) {
        return b.rarity - a.rarity
      }
      return a.name.localeCompare(b.name)
    })
    return copy
  }, [displayPrizes])

  const wheelEligiblePrizes = useMemo(() => {
    const usablePrizes = availablePrizes.filter(
      (prize) => !(prize.removeAfterWin && prize.removedFromWheel),
    )
    let filtered = usablePrizes
    if (selectedLevel === 'advanced') {
      filtered = usablePrizes.filter((prize) => prize.rarity > 1)
    } else if (selectedLevel === 'epic') {
      filtered = usablePrizes.filter((prize) => prize.rarity > 2)
    }
    return filtered.length > 0 ? filtered : usablePrizes
  }, [availablePrizes, selectedLevel])

  const weightedPrizes = useMemo(() => {
    if (!wheelEligiblePrizes.length) {
      return [] as Array<{ prize: Prize; weight: number }>
    }

    const luckModifier = user?.luckModifier ?? 0

    if (!selectedSetting) {
      return wheelEligiblePrizes.map((prize) => ({
        prize,
        weight: RARITY_BASE_WEIGHTS[prize.rarity],
      }))
    }

    const weights = calculatePrizeWeights({
      prizes: wheelEligiblePrizes,
      level: selectedSetting,
      luckModifier,
    })

    const hasPositive = weights.some((item) => item.weight > 0)
    const normalized = hasPositive
      ? weights
      : wheelEligiblePrizes.map((prize) => ({
          prize,
          weight: RARITY_BASE_WEIGHTS[prize.rarity],
          effectiveRarity: prize.rarity,
        }))

    return normalized.map(({ prize, weight }) => ({ prize, weight }))
  }, [wheelEligiblePrizes, selectedSetting, user?.luckModifier])

  const handleLoadUser = () => {
    if (!userIdInput.trim()) return
    setUserId(userIdInput.trim())
  }

  const handleSpin = () => {
    if (!userId || isSpinInProgress) {
      return
    }
    setIsSpinInProgress(true)
    setIsWaitingForResult(true)
    setRevealedResult(null)
    setPendingResult(null)
    setPendingUserUpdate(null)
    setPendingSnackbarMessage(null)
    spinMutation.mutate({ userId, betLevel: selectedLevel })
  }

  const handleBuy = (prizeId: string) => {
    if (!userId || isSpinInProgress) return
    const prize = prizes.find((item) => item.prizeId === prizeId)
    if (prize?.removeAfterWin && prize.removedFromWheel) {
      return
    }
    buyMutation.mutate({ userId, prizeId })
  }

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {appName}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <ThemeToggle />
            <Button component={RouterLink} to="/" color="inherit">
              Главная
            </Button>
            <TextField
              size="small"
              label="User ID"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
            />
            <Button variant="contained" color="inherit" onClick={handleLoadUser}>
              Загрузить
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        {!userId ? (
          <Stack spacing={3} alignItems="center">
            <Typography variant="h5" textAlign="center">
              Введите идентификатор сотрудника, чтобы управлять балансом уточек и крутить колесо.
            </Typography>
            <TextField
              label="User ID"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
            />
            <Button variant="contained" onClick={handleLoadUser}>
              Продолжить
            </Button>
          </Stack>
        ) : isLoading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : user ? (
          <Stack spacing={4}>
            <BalanceCard user={user} />
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={3}
              alignItems={{ lg: 'flex-start' }}
            >
              <Box sx={{ width: { xs: '100%', lg: 500 }, flexShrink: 0 }}>
                <Wheel
                  weightedPrizes={weightedPrizes}
                  targetPrizeId={pendingResult?.prize?.prizeId}
                  revealedPrize={revealedResult?.prize}
                  revealedRarity={revealedResult?.rarity}
                  isWaitingForResult={isWaitingForResult}
                  onSpinStart={() => {
                    setIsWaitingForResult(false)
                  }}
                  onSpinComplete={() => {
                    const result = pendingResultRef.current
                    if (result) {
                      setRevealedResult(result)
                      pendingResultRef.current = null
                    }
                    setPendingResult(null)
                    if (pendingUserUpdate && userId) {
                      queryClient.setQueryData(['user', userId], {
                        user: pendingUserUpdate,
                        appName,
                      })
                      setPendingUserUpdate(null)
                      queryClient.invalidateQueries({ queryKey: ['logs', userId] })
                    }
                    if (pendingSnackbarMessage) {
                      setSnackbar({ message: pendingSnackbarMessage, severity: 'success' })
                      setPendingSnackbarMessage(null)
                    }
                    if (result?.prize?.removeAfterWin) {
                      queryClient.invalidateQueries({ queryKey: ['prizes'] })
                    }
                    setIsSpinInProgress(false)
                    setIsWaitingForResult(false)
                  }}
                />
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <SpinPanel
                  levels={orderedLevels}
                  selectedLevel={selectedLevel}
                  onSelect={setSelectedLevel}
                  onSpin={handleSpin}
                  isSpinning={
                    isSpinInProgress || spinMutation.isPending || Boolean(pendingResult)
                  }
                  disabled={
                    !user ||
                    isSpinInProgress ||
                    spinMutation.isPending ||
                    Boolean(pendingResult)
                  }
                  canSpin={
                    user !== null &&
                    user.balance >= (settingsMap?.[selectedLevel]?.spinCost ?? 0)
                  }
                />
              </Box>
            </Stack>
            <Stack spacing={2}>
              <Typography variant="h6">Активный пул призов</Typography>
              <PrizeGrid
                prizes={sortedDisplayPrizes}
                onBuy={(prize) => handleBuy(prize.prizeId)}
                disabled={buyMutation.isPending}
              />
            </Stack>
            <SpinHistory logs={logs} orders={orders} />
            {isAdminView ? (
              <AdminPanel
                prizes={prizes}
                settings={orderedLevels}
                onSavePrize={adminPrizeMutation.mutate}
                onSaveSetting={adminSettingMutation.mutate}
                isSaving={
                  adminPrizeMutation.isPending || adminSettingMutation.isPending
                }
              />
            ) : null}
          </Stack>
        ) : (
          <Alert severity="error">
            Пользователь не найден. Проверьте идентификатор или добавьте запись в Google Sheets.
          </Alert>
        )}
      </Container>
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? <Alert severity={snackbar.severity}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </>
  )
}

export default WheelPage
