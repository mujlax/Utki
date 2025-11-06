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
        </Stack>
      </CardContent>
    </Card>
  )
}
