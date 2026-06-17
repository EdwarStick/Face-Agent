import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  TablePagination,
  Box,
  Typography,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import type { DetalleAsistenciaHoy } from '../types';

interface Props {
  asistencias: DetalleAsistenciaHoy[];
  onVerReporte: (empleadoId: string) => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHoras(horas: number | null): string {
  if (horas == null) return '-';
  return `${horas.toFixed(2)} hrs`;
}

function getEstadoChip(estado: string | null) {
  switch (estado) {
    case 'presente':
      return <Chip label="Presente" color="success" size="small" variant="outlined" sx={{ fontWeight: 'medium' }} />;
    case 'tarde':
      return <Chip label="Tarde" color="warning" size="small" variant="outlined" sx={{ fontWeight: 'medium' }} />;
    case 'ausente':
      return <Chip label="Ausente" color="error" size="small" variant="outlined" sx={{ fontWeight: 'medium' }} />;
    default:
      return <Chip label={estado ?? '-'} size="small" variant="outlined" />;
  }
}

export function AsistenciasHoyTable({ asistencias, onVerReporte }: Props) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginated = asistencias.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (asistencias.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No hay asistencias registradas hoy.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="asistencias de hoy">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Empleado</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Cargo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Área</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Entrada</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Salida</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tiempo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Confianza</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Reporte</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((a) => (
              <TableRow key={a.empleado_id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ fontWeight: 600 }}>{a.nombre_completo}</TableCell>
                <TableCell>{a.cargo || 'N/A'}</TableCell>
                <TableCell>{a.area || 'N/A'}</TableCell>
                <TableCell>{formatTime(a.hora_entrada)}</TableCell>
                <TableCell>{formatTime(a.hora_salida)}</TableCell>
                <TableCell>{formatHoras(a.horas_trabajadas)}</TableCell>
                <TableCell>{getEstadoChip(a.estado)}</TableCell>
                <TableCell>{a.porcentaje_confianza != null ? `${a.porcentaje_confianza}%` : '-'}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Ver Reporte Individual">
                    <IconButton
                      color="secondary"
                      onClick={() => onVerReporte(a.empleado_id)}
                      size="small"
                    >
                      <BarChartIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={asistencias.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </Paper>
  );
}
