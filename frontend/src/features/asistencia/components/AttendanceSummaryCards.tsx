import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { DashboardSummary } from '../types/attendance.types';

interface Props {
  summary: DashboardSummary;
}

const cards = [
  {
    label: 'Total',
    value: (s: DashboardSummary) => s.total,
    icon: <PeopleIcon sx={{ fontSize: 32 }} />,
    color: '#2563eb',
    bg: '#eff6ff',
  },
  {
    label: 'Presentes',
    value: (s: DashboardSummary) => s.presentes,
    icon: <CheckCircleIcon sx={{ fontSize: 32 }} />,
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    label: 'Ausentes',
    value: (s: DashboardSummary) => s.ausentes,
    icon: <CancelIcon sx={{ fontSize: 32 }} />,
    color: '#dc2626',
    bg: '#fef2f2',
  },
  {
    label: 'Pendientes',
    value: (s: DashboardSummary) => s.pendientes,
    icon: <AccessTimeIcon sx={{ fontSize: 32 }} />,
    color: '#d97706',
    bg: '#fffbeb',
  },
];

export function AttendanceSummaryCards({ summary }: Props) {
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap">
      {cards.map((card) => (
        <Paper
          key={card.label}
          sx={{
            flex: '1 1 160px',
            minWidth: 140,
            p: 2,
            borderRadius: 3,
            bgcolor: card.bg,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ color: card.color }}>{card.icon}</Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {card.label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: card.color }}>
              {card.value(summary)}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}
