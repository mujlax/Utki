import {
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
  Button,
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import type { Prize, Rarity } from '../lib/types'

const rarityLabel: Record<Rarity, string> = {
  1: 'Обычный',
  2: 'Редкий',
  3: 'Эпический',
  4: 'Легендарный',
}

const rarityColor: Record<Rarity, 'default' | 'primary' | 'success' | 'warning'> = {
  1: 'default',
  2: 'primary',
  3: 'success',
  4: 'warning',
}

interface PrizeCardProps {
  prize: Prize
  onBuy?: (prize: Prize) => void
  disabled?: boolean
}

export const PrizeCard = ({ prize, onBuy, disabled }: PrizeCardProps) => {
  const isRemoved = prize.removeAfterWin && prize.removedFromWheel
  const statusLabel = (() => {
    if (isRemoved) {
      return 'Уже выигран'
    }
    return prize.active ? 'Активен' : 'Выключен'
  })()

  const statusColor = (() => {
    if (isRemoved) {
      return 'warning.main'
    }
    return prize.active ? 'success.main' : 'error.main'
  })()

  const canBuy =
    !isRemoved && prize.directBuyEnabled && prize.directBuyPrice !== undefined && onBuy

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{prize.name}</Typography>
            <Chip
              label={rarityLabel[prize.rarity]}
              color={rarityColor[prize.rarity]}
              size="small"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {prize.description}
          </Typography>
          {prize.removeAfterWin && !isRemoved && (
            <Chip
              icon={<InfoIcon sx={{ fontSize: 16 }} />}
              label="Можно выиграть только 1 раз"
              size="small"
              color="info"
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
          <Typography variant="body2" color={statusColor}>
            {statusLabel}
          </Typography>
        </Stack>
      </CardContent>
      {canBuy ? (
        <CardActions>
          <Button onClick={() => onBuy(prize)} disabled={disabled}>
            Купить за {prize.directBuyPrice} уточек
          </Button>
        </CardActions>
      ) : null}
    </Card>
  )
}
