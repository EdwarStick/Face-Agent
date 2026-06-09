import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Alert,
  Paper,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useEmployees } from '../hooks/useEmployees';
import type { EmpleadoResponse } from '../types';
import EmployeeTable from '../components/EmployeeTable';
import EmployeeSearch from '../components/EmployeeSearch';
import EmployeeForm from '../components/EmployeeForm';
import EmployeeModal from '../components/EmployeeModal';

export const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    employees,
    loading,
    error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  } = useEmployees();

  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmpleadoResponse | null>(null);
  
  // Delete Confirmation Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmpleadoResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Snackbar Notification State
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showToast = (message: string, severity: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, severity });
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter((emp) => {
    const term = searchQuery.toLowerCase();
    const fullName = `${emp.prim_nombre} ${emp.seg_nombres || ''} ${emp.prim_apellido} ${emp.seg_apellido || ''}`.toLowerCase();
    const doc = emp.codigo_empleado.toLowerCase();
    return fullName.includes(term) || doc.includes(term);
  });

  const handleCreateClick = () => {
    setSelectedEmployee(null);
    setActionError(null);
    setFormOpen(true);
  };

  const handleEditClick = (employee: EmpleadoResponse) => {
    setSelectedEmployee(employee);
    setActionError(null);
    setFormOpen(true);
  };

  const handleDeleteClick = (employee: EmpleadoResponse) => {
    setEmployeeToDelete(employee);
    setActionError(null);
    setDeleteOpen(true);
  };

  const handleViewClick = (employee: EmpleadoResponse) => {
    navigate(`/empleados/${employee.id}`);
  };

  const handleFormSubmit = async (data: any) => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (selectedEmployee) {
        await updateEmployee(selectedEmployee.id, data);
        showToast('Empleado actualizado correctamente');
      } else {
        await createEmployee(data);
        showToast('Empleado creado correctamente');
      }
      setFormOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Ocurrió un error en el formulario');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await deleteEmployee(employeeToDelete.id);
      showToast('Empleado desactivado correctamente');
      setDeleteOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Error al desactivar el empleado');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" color="text.primary" sx={{ fontWeight: 'bold' }}>
            Gestión de Empleados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra los registros y la información del personal del sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
          sx={{ borderRadius: 2, px: 3, py: 1 }}
        >
          Nuevo Empleado
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <Box sx={{ mb: 3 }}>
          <EmployeeSearch value={searchQuery} onChange={setSearchQuery} />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <EmployeeTable
            employees={filteredEmployees}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onView={handleViewClick}
          />
        )}
      </Paper>

      {/* Create / Edit Form Dialog */}
      <Dialog
        open={formOpen}
        onClose={actionLoading ? undefined : () => setFormOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {selectedEmployee ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <EmployeeForm
              initialValues={selectedEmployee}
              onSubmit={handleFormSubmit}
              onCancel={() => setFormOpen(false)}
              loading={actionLoading}
              error={actionError}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <EmployeeModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="¿Desactivar Empleado?"
        description={`¿Está seguro de que desea desactivar a ${employeeToDelete?.prim_nombre} ${employeeToDelete?.prim_apellido}? Esto lo marcará como Inactivo en el sistema.`}
        confirmText="Desactivar"
        loading={actionLoading}
        severity="error"
      />

      {/* Toast feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmployeeListPage;
