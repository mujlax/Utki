import { Card, CardContent, Stack, Typography, LinearProgress } from '@mui/material'
import type { User } from '../lib/types'

interface BalanceCardProps {
  user: User
}

const toPercent = (value: number) => Math.round(value * 100)

export const BalanceCard = ({ user }: BalanceCardProps) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{user.name}</Typography>
            <Typography color="text.secondary">ID: {user.userId}</Typography>
          </Stack>
          <Stack direction="row" spacing={4}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Баланс уточек
              </Typography>
              <Typography variant="h4">{user.balance}</Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Круток
              </Typography>
              <Typography variant="h4">{user.spinsTotal}</Typography>
            </Stack>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Удача (pity)
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, toPercent(user.luckModifier))}
            />
            <Typography variant="body2" color="text.secondary">
              +{toPercent(user.luckModifier)}% к шансам на редкое
            </Typography>
          </Stack>
          {user.lastResult ? (
            <Typography variant="body2" color="text.secondary">
              Последний приз: {user.lastResult}
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary">
            Обновлено: {new Date(user.updatedAt).toLocaleString()}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
