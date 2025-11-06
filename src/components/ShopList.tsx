import {
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Button,
  Chip,
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import type { Prize } from '../lib/types'

interface ShopListProps {
  prizes: Prize[]
  onBuy: (prizeId: string) => void
  disabled?: boolean
}

export const ShopList = ({ prizes, onBuy, disabled }: ShopListProps) => {
  const available = prizes.filter(
    (prize) => prize.directBuyEnabled && prize.directBuyPrice !== undefined && prize.active,
  )
  if (available.length === 0) {
    return null
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Прямые покупки</Typography>
          <List>
            {available.map((prize) => {
              const isRemoved = prize.removeAfterWin && prize.removedFromWheel
              const secondaryText = (() => {
                let text = prize.description
                if (prize.removeAfterWin && !isRemoved) {
                  text += ' • Можно выиграть только 1 раз'
                }
                return text
              })()
              
              return (
                <ListItem
                  key={prize.prizeId}
                  secondaryAction={
                    <Stack direction="row" spacing={1} alignItems="center">
                      {prize.removeAfterWin && !isRemoved && (
                        <Chip
                          icon={<InfoIcon sx={{ fontSize: 14 }} />}
                          label="1 раз"
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                      <Button onClick={() => onBuy(prize.prizeId)} disabled={disabled || isRemoved}>
                        Купить за {prize.directBuyPrice}
                      </Button>
                    </Stack>
                  }
                >
                  <ListItemText primary={prize.name} secondary={secondaryText} />
                </ListItem>
              )
            })}
          </List>
        </Stack>
      </CardContent>
    </Card>
  )
}
