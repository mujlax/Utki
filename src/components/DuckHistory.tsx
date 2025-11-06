import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Alert,
  Chip,
} from '@mui/material'
import { apiClient } from '../api/client'
import type { DuckHistoryEntry } from '../lib/types'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'

interface DuckHistoryProps {
  userId: string
}

export const DuckHistory = ({ userId }: DuckHistoryProps) => {
  const historyQuery = useQuery({
    queryKey: ['duck-history', userId],
    queryFn: () => apiClient.getDuckHistory(userId),
    enabled: !!userId,
    staleTime: 30_000,
  })

  if (historyQuery.isLoading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Загрузка истории...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (historyQuery.isError) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Alert severity="error">
            Не удалось загрузить историю уточек: {(historyQuery.error as Error)?.message}
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const history = historyQuery.data?.history ?? []

  if (history.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            История уточек
          </Typography>
          <Typography variant="body2" color="text.secondary">
            История пока пуста
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">История уточек</Typography>
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {history.map((entry: DuckHistoryEntry) => {
              const isPositive = entry.amount > 0
              const date = new Date(entry.createdAt)
              return (
                <ListItem
                  key={entry.entryId}
                  sx={{
                    borderLeft: `3px solid ${isPositive ? '#4caf50' : '#f44336'}`,
                    mb: 1,
                    bgcolor: 'background.paper',
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        {isPositive ? (
                          <AddIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                        ) : (
                          <RemoveIcon sx={{ color: '#f44336', fontSize: 20 }} />
                        )}
                        <Chip
                          label={`${isPositive ? '+' : ''}${entry.amount}`}
                          color={isPositive ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {date.toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Stack>
                    }
                    secondary={entry.note}
                    secondaryTypographyProps={{
                      sx: { mt: 0.5 },
                    }}
                  />
                </ListItem>
              )
            })}
          </List>
        </Stack>
      </CardContent>
    </Card>
  )
}

