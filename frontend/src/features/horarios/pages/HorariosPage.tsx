import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useHorarios } from '../hooks/useHorarios';
import { HorarioTable } from '../components/HorarioTable';
import { HorarioFormModal } from '../components/HorarioFormModal';
import type { HorarioResponse, HorarioCreate, HorarioUpdate } from '../types/horario.types';

export function HorariosPage() {
  const {
    horarios,
    employees,
    loading,
    error,
    selectedEmpleadoId,
    setSelectedEmpleadoId,
    create,
    update,
    remove,
  } = useHorarios();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HorarioResponse | null>(null);

  const handleNew = useCallback(() => {
    if (!selectedEmpleadoId) return;
    setEditing(null);
    setModalOpen(true);
  }, [selectedEmpleadoId]);

  const handleEdit = useCallback((h: HorarioResponse) => {
    setEditing(h);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('¿Desactivar este horario?')) return;
    await remove(id);
  }, [remove]);

  const handleSave = useCallback(async (data: HorarioCreate | HorarioUpdate) => {
    if (editing) {
      await update(editing.id, data as HorarioUpdate);
    } else {
      await create(data as HorarioCreate);
    }
  }, [editing, create, update]);

  const filteredHorarios = selectedEmpleadoId
    ? horarios.filter((h) => h.empleado_id === selectedEmpleadoId)
    : horarios;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <ScheduleIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Gestión de Horarios
        </Typography>
      </Box>

      <Stack spacing={3}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            label="Filtrar por empleado"
            value={selectedEmpleadoId ?? ''}
            onChange={(e) => setSelectedEmpleadoId(e.target.value || undefined)}
            sx={{ minWidth: 240 }}
            size="small"
          >
            <MenuItem value="">Todos los empleados</MenuItem>
            {employees.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.prim_nombre} {emp.prim_apellido}
              </MenuItem>
            ))}
          </TextField>

          {selectedEmpleadoId && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNew}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Nuevo horario
            </Button>
          )}
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <HorarioTable
            horarios={filteredHorarios}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </Stack>

      <HorarioFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        horario={editing}
        empleadoId={selectedEmpleadoId}
      />
    </Box>
  );
}
