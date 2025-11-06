import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import type { WheelSetting, WheelLevelKey } from '../lib/types'

interface SpinPanelProps {
  levels: WheelSetting[]
  selectedLevel: WheelLevelKey
  onSelect: (level: WheelLevelKey) => void
  onSpin: () => void
  isSpinning: boolean
  disabled?: boolean
}

const levelLabel: Record<WheelLevelKey, string> = {
  basic: 'Базовый',
  advanced: 'Продвинутый',
  epic: 'Эпический',
  legendary: 'Легендарный',
}

export const SpinPanel = ({
  levels,
  selectedLevel,
  onSelect,
  onSpin,
  isSpinning,
  disabled,
}: SpinPanelProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const selectedDetails = levels.find((level) => level.level === selectedLevel)

  const handleSelect = (_: React.MouseEvent<HTMLElement>, value: WheelLevelKey | null) => {
    if (disabled || isSpinning) {
      return
    }
    if (!value) {
      setIsDetailsOpen((prev) => !prev)
      return
    }
    onSelect(value)
    setIsDetailsOpen(true)
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h6">Выбор ставки</Typography>
          <ToggleButtonGroup
            value={selectedLevel}
            exclusive
            onChange={handleSelect}
            color="primary"
            fullWidth
            disabled={disabled || isSpinning}
          >
            {levels.map((level) => (
              <ToggleButton key={level.level} value={level.level}>
                {levelLabel[level.level]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Collapse in={isDetailsOpen && Boolean(selectedDetails)}>
            {selectedDetails ? (
              <Stack spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle2">
                  {levelLabel[selectedDetails.level]} режим
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Стоимость крутки: {selectedDetails.spinCost} уточек
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Предел удачи: +{Math.round(selectedDetails.pityMax * 100)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Бонус серии: каждые {selectedDetails.seriesBonusEvery} круток
                </Typography>
              </Stack>
            ) : null}
          </Collapse>
          <Button
            onClick={onSpin}
            variant="contained"
            size="large"
            disabled={disabled || isSpinning}
            startIcon={
              isSpinning ? <CircularProgress size={20} color="inherit" thickness={5} /> : null
            }
          >
            {isSpinning ? 'Крутим...' : 'Крутить колесо'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
