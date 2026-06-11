import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { HorarioResponse } from '../types/horario.types';
import { DIAS_SEMANA } from '../types/horario.types';

interface Props {
  horarios: HorarioResponse[];
  onEdit: (h: HorarioResponse) => void;
  onDelete: (id: string) => void;
}

export function HorarioTable({ horarios, onEdit, onDelete }: Props) {
  if (horarios.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, color: 'text.secondary' }}>
        No hay horarios registrados. Crea uno nuevo.
      </Paper>
    );
  }

  return (
    <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Día</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Entrada</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Salida</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {horarios.map((h) => (
              <TableRow key={h.id}>
                <TableCell sx={{ fontWeight: 600 }}>
                  {DIAS_SEMANA[h.dia_semana] ?? `Día ${h.dia_semana}`}
                </TableCell>
                <TableCell>{h.hora_entrada.slice(0, 5)}</TableCell>
                <TableCell>{h.hora_salida.slice(0, 5)}</TableCell>
                <TableCell>
                  {h.activo
                    ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Activo</span>
                    : <span style={{ color: '#dc2626', fontWeight: 600 }}>Inactivo</span>}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onEdit(h)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(h.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
