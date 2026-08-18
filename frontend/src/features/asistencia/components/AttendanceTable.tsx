import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import type { AttendanceRecord, AttendancePagination } from '../types/attendance.types';
import { AttendanceStatusChip } from './AttendanceStatusChip';
import { AttendanceEmptyState } from './AttendanceEmptyState';

interface Props {
  data: AttendanceRecord[];
  pagination: AttendancePagination;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onRowClick: (record: AttendanceRecord) => void;
}

function formatFechaDisplay(fechaStr: string | null | undefined): string {
  if (!fechaStr) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }
  return new Date(fechaStr).toLocaleDateString();
}

export function AttendanceTable({ data, pagination, onPageChange, onLimitChange, onRowClick }: Props) {
  if (data.length === 0) {
    return <AttendanceEmptyState />;
  }

  return (
    <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Empleado</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Documento</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Hora entrada</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Hora salida</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onRowClick(row)}
              >
                <TableCell>{row.empleado_nombre}</TableCell>
                <TableCell>{row.documento}</TableCell>
                <TableCell>{formatFechaDisplay(row.fecha)}</TableCell>
                <TableCell>
                  {row.hora_entrada
                    ? new Date(row.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </TableCell>
                <TableCell>
                  {row.hora_salida
                    ? new Date(row.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </TableCell>
                <TableCell>
                  <AttendanceStatusChip estado={row.estado} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={pagination.total}
        page={pagination.page - 1}
        rowsPerPage={pagination.limit}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        onRowsPerPageChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
        labelRowsPerPage="Registros por página"
      />
    </Paper>
  );
}
