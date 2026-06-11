import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import type { HorarioResponse, HorarioCreate, HorarioUpdate } from '../types/horario.types';
import { DIAS_SEMANA } from '../types/horario.types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: HorarioCreate | HorarioUpdate) => Promise<void>;
  horario: HorarioResponse | null;
  empleadoId?: string;
}

export function HorarioFormModal({ open, onClose, onSave, horario, empleadoId }: Props) {
  const [diaSemana, setDiaSemana] = useState(0);
  const [horaEntrada, setHoraEntrada] = useState('08:00');
  const [horaSalida, setHoraSalida] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (horario) {
      setDiaSemana(horario.dia_semana);
      setHoraEntrada(horario.hora_entrada.slice(0, 5));
      setHoraSalida(horario.hora_salida.slice(0, 5));
    } else {
      setDiaSemana(0);
      setHoraEntrada('08:00');
      setHoraSalida('17:00');
    }
    setError(null);
  }, [horario, open]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (horario) {
        await onSave({
          dia_semana: diaSemana,
          hora_entrada: `${horaEntrada}:00`,
          hora_salida: `${horaSalida}:00`,
        } as HorarioUpdate);
      } else {
        await onSave({
          empleado_id: empleadoId!,
          dia_semana: diaSemana,
          hora_entrada: `${horaEntrada}:00`,
          hora_salida: `${horaSalida}:00`,
        } as HorarioCreate);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? String((err as { response: { data?: { detail?: string } } }).response?.data?.detail ?? err)
        : 'Error al guardar horario';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {horario ? 'Editar horario' : 'Nuevo horario'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select
            label="Día de la semana"
            value={diaSemana}
            onChange={(e) => setDiaSemana(Number(e.target.value))}
            fullWidth
          >
            {DIAS_SEMANA.map((dia, i) => (
              <MenuItem key={i} value={i}>{dia}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Hora de entrada"
            type="time"
            value={horaEntrada}
            onChange={(e) => setHoraEntrada(e.target.value)}
            fullWidth
          />
          <TextField
            label="Hora de salida"
            type="time"
            value={horaSalida}
            onChange={(e) => setHoraSalida(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
