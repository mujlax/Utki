import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Stack,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Box,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { apiClient } from '../api/client'
import type { UserOverview, Rarity } from '../lib/types'

const rarityAccent: Record<Rarity, string> = {
  1: '#9e9e9e',
  2: '#4caf50',
  3: '#00acc1',
  4: '#ff9800',
}

const renderWins = (wins: UserOverview['wins']) => {
  if (!wins.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Пока без призов
      </Typography>
    )
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {wins.map((win) => (
        <Chip
          key={`${win.prizeId ?? win.prizeName}-${win.rarity}`}
          label={`${win.prizeName}${win.count > 1 ? ` ×${win.count}` : ''}`}
          sx={{
            backgroundColor: rarityAccent[win.rarity],
            color: '#fff',
          }}
        />
      ))}
    </Stack>
  )
}

const HomePage = () => {
  const overviewQuery = useQuery({
    queryKey: ['users-overview'],
    queryFn: apiClient.getUsersOverview,
    staleTime: 60_000,
  })

  const users = overviewQuery.data?.users ?? []
  const totalDucks = users.reduce((sum, user) => sum + user.balance, 0)

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Колесо уточечной удачи
          </Typography>
          <Button component={RouterLink} to="/wheel" color="inherit" variant="outlined">
            Перейти к колесу
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        {overviewQuery.isLoading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : overviewQuery.isError ? (
          <Alert severity="error">
            {(overviewQuery.error as Error)?.message ?? 'Не удалось загрузить участников'}
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <Typography variant="h6">Участники: {users.length}</Typography>
                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                  <Typography variant="h6">Всего уточек: {totalDucks}</Typography>
                </Stack>
              </CardContent>
            </Card>
            {users.map((participant) => (
              <Card key={participant.userId} variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                      <Typography variant="h6">{participant.name}</Typography>
                      <Chip
                        label={`${participant.balance} уточек`}
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                    {renderWins(participant.wins)}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </>
  )
}

export default HomePage
