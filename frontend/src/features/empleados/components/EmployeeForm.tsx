import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  TextField,
  Button,
  Grid,
  Box,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { EmpleadoResponse } from '../types';
import { employeeValidationRules } from '../validations/employeeSchema';

interface EmployeeFormProps {
  initialValues?: EmpleadoResponse | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  error = null,
}) => {
  const isEdit = !!initialValues;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      codigo_empleado: initialValues?.codigo_empleado || '',
      prim_nombre: initialValues?.prim_nombre || '',
      seg_nombres: initialValues?.seg_nombres || '',
      prim_apellido: initialValues?.prim_apellido || '',
      seg_apellido: initialValues?.seg_apellido || '',
      correo: initialValues?.correo || null,
      telefono: initialValues?.telefono || null,
      cargo: initialValues?.cargo || null,
      area: initialValues?.area || null,
      activo: initialValues?.activo ?? true,
    },
  });

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            required
            label="Código / Documento"
            error={!!errors.codigo_empleado}
            helperText={errors.codigo_empleado?.message}
            {...register('codigo_empleado', employeeValidationRules.codigo_empleado)}
            disabled={loading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            required
            label="Primer Nombre"
            error={!!errors.prim_nombre}
            helperText={errors.prim_nombre?.message}
            {...register('prim_nombre', employeeValidationRules.prim_nombre)}
            disabled={loading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Segundo Nombre (Opcional)"
            {...register('seg_nombres')}
            disabled={loading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            required
            label="Primer Apellido"
            error={!!errors.prim_apellido}
            helperText={errors.prim_apellido?.message}
            {...register('prim_apellido', employeeValidationRules.prim_apellido)}
            disabled={loading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Segundo Apellido (Opcional)"
            {...register('seg_apellido')}
            disabled={loading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Correo Electrónico (Opcional)"
            type="email"
            error={!!errors.correo}
            helperText={errors.correo?.message}
            {...register('correo', employeeValidationRules.correo)}
            disabled={loading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Teléfono (Opcional)"
            error={!!errors.telefono}
            helperText={errors.telefono?.message}
            {...register('telefono', employeeValidationRules.telefono)}
            disabled={loading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Cargo"
            {...register('cargo')}
            disabled={loading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Área"
            {...register('area')}
            disabled={loading}
          />
        </Grid>

        {isEdit && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="activo"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Empleado Activo"
                />
              )}
            />
          </Grid>
        )}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
        <Button onClick={onCancel} disabled={loading} variant="outlined" color="inherit">
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
        </Button>
      </Box>
    </Box>
  );
};

export default EmployeeForm;
