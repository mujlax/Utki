import { Grid } from '@mui/material'
import type { Prize } from '../lib/types'
import { PrizeCard } from './PrizeCard'

interface PrizeGridProps {
  prizes: Prize[]
  onBuy?: (prizeId: string) => void
  disabled?: boolean
  wonPrizeIds?: Set<string>
}

export const PrizeGrid = ({ prizes, onBuy, disabled, wonPrizeIds }: PrizeGridProps) => (
  <Grid container spacing={2}>
    {prizes.map((prize) => (
      <Grid item key={prize.prizeId} xs={12} sm={6} md={4} lg={3}>
        <PrizeCard 
          prize={prize} 
          onBuy={onBuy ? (p) => onBuy(p.prizeId) : undefined} 
          disabled={disabled}
          isWonByUser={wonPrizeIds?.has(prize.prizeId)}
        />
      </Grid>
    ))}
  </Grid>
)
