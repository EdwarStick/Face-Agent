import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import type { AttendanceFiltersState } from '../types/attendance.types';

interface Props {
  filters: AttendanceFiltersState;
  onFilterChange: <K extends keyof AttendanceFiltersState>(key: K, value: AttendanceFiltersState[K]) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function AttendanceFilters({ filters, onFilterChange, onReset, hasActiveFilters }: Props) {
  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Buscar por nombre"
            value={filters.nombre}
            onChange={(e) => onFilterChange('nombre', e.target.value)}
            placeholder="Nombre del empleado"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Buscar por documento"
            value={filters.documento}
            onChange={(e) => onFilterChange('documento', e.target.value)}
            placeholder="Código del empleado"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Fecha exacta"
            type="date"
            value={filters.fecha}
            onChange={(e) => onFilterChange('fecha', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Desde"
            type="date"
            value={filters.desde}
            onChange={(e) => onFilterChange('desde', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Hasta"
            type="date"
            value={filters.hasta}
            onChange={(e) => onFilterChange('hasta', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
      </Grid>
      {hasActiveFilters && (
        <Button variant="text" color="primary" onClick={onReset} sx={{ alignSelf: 'flex-start' }}>
          Limpiar filtros
        </Button>
      )}
    </Stack>
  );
}
