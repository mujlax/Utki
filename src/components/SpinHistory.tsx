import { useMemo } from 'react'
import {
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import type { ShopOrder, SpinLogEntry } from '../lib/types'

interface SpinHistoryProps {
  logs: SpinLogEntry[]
  orders: ShopOrder[]
}

export const SpinHistory = ({ logs, orders }: SpinHistoryProps) => {
  const sortedLogs = useMemo(() => {
    return [...logs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [logs])

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">История круток</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Ставка</TableCell>
                  <TableCell>Приз</TableCell>
                  <TableCell>Редкость</TableCell>
                  <TableCell>Баланс</TableCell>
                  <TableCell>Удача</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedLogs.map((log) => (
                  <TableRow key={log.logId}>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{log.betLevel}</TableCell>
                    <TableCell>{log.prizeName}</TableCell>
                    <TableCell>{log.rarity}</TableCell>
                    <TableCell>
                      {log.balanceBefore} → {log.balanceAfter}
                    </TableCell>
                    <TableCell>
                      {log.luckModifierBefore.toFixed(2)} → {log.luckModifierAfter.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Покупки</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Приз</TableCell>
                  <TableCell>Цена</TableCell>
                  <TableCell>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{order.prizeId}</TableCell>
                    <TableCell>{order.price}</TableCell>
                    <TableCell>{order.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
