import { useEffect, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { Prize, WheelSetting } from '../../lib/types'
import { PrizeManager } from './PrizeManager'
import { SettingsManager } from './SettingsManager'
import { DuckManager } from './DuckManager'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { useUserStore } from '../../store/userStore'

interface AdminPanelProps {
  prizes: Prize[]
  settings: WheelSetting[]
  onSavePrize: (prize: Prize) => void
  onSaveSetting: (setting: WheelSetting) => void
  isSaving: boolean
}

export const AdminPanel = ({
  prizes,
  settings,
  onSavePrize,
  onSaveSetting,
  isSaving,
}: AdminPanelProps) => {
  const { authSecret, setAuthSecret } = useUserStore()
  const [localSecret, setLocalSecret] = useState(authSecret ?? '')
  const queryClient = useQueryClient()

  const usersQuery = useQuery({ queryKey: ['users-overview'], queryFn: apiClient.getUsersOverview })

  const addDucksMutation = useMutation({
    mutationFn: (payload: { userId: string; amount: number; note: string }) =>
      apiClient.addDucks({
        ...payload,
        authSecret: authSecret ?? undefined,
      }),
    onSuccess: (data) => {
      // Обновляем кэш пользователя
      queryClient.invalidateQueries({ queryKey: ['user', data.user.userId] })
      // Обновляем историю уточек
      queryClient.invalidateQueries({ queryKey: ['duck-history', data.user.userId] })
      // Обновляем обзор пользователей
      queryClient.invalidateQueries({ queryKey: ['users-overview'] })
    },
    onSettled: () => {
      // После завершения операции (успех или ошибка) форма очистится через DuckManager
    },
  })

  useEffect(() => {
    setLocalSecret(authSecret ?? '')
  }, [authSecret])

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h6">Админ-панель</Typography>
          <TextField
            label="AUTH_SECRET"
            type="password"
            value={localSecret}
            onChange={(event) => {
              const value = event.target.value
              setLocalSecret(value)
              const trimmed = value.trim()
              setAuthSecret(trimmed ? trimmed : null)
            }}
            helperText="Секрет для админских операций (из .env)"
          />
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Призы</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <PrizeManager prizes={prizes} onSave={onSavePrize} isSaving={isSaving} />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Настройки колеса</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <SettingsManager
                settings={settings}
                onSave={onSaveSetting}
                isSaving={isSaving}
              />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Управление уточками</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <DuckManager
                users={(usersQuery.data?.users ?? []).map((u) => ({
                  userId: u.userId,
                  name: u.name,
                  balance: u.balance,
                  totalEarned: 0,
                  spinsTotal: 0,
                  luckModifier: 0,
                  role: 'user',
                  updatedAt: new Date(0).toISOString(),
                }))}
                onAdd={(payload) => {
                  addDucksMutation.mutate(payload)
                }}
                isSaving={addDucksMutation.isPending}
                onSuccess={() => {
                  // Форма очистится автоматически через DuckManager
                }}
              />
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  )
}
