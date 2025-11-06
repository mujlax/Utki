import {
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Button,
} from '@mui/material'
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
            {available.map((prize) => (
              <ListItem
                key={prize.prizeId}
                secondaryAction={
                  <Button onClick={() => onBuy(prize.prizeId)} disabled={disabled}>
                    Купить за {prize.directBuyPrice}
                  </Button>
                }
              >
                <ListItemText primary={prize.name} secondary={prize.description} />
              </ListItem>
            ))}
          </List>
        </Stack>
      </CardContent>
    </Card>
  )
}
