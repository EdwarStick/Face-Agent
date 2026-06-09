import React, { useState } from 'react';
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { EmpleadoResponse } from '../types';

interface EmployeeTableProps {
  employees: EmpleadoResponse[];
  onEdit: (employee: EmpleadoResponse) => void;
  onDelete: (employee: EmpleadoResponse) => void;
  onView: (employee: EmpleadoResponse) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  onEdit,
  onDelete,
  onView,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatFullName = (employee: EmpleadoResponse) => {
    return [
      employee.prim_nombre,
      employee.seg_nombres,
      employee.prim_apellido,
      employee.seg_apellido,
    ]
      .filter(Boolean)
      .join(' ');
  };

  const paginatedEmployees = employees.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (employees.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No se encontraron empleados registrados.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="tabla de empleados">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Documento / Código</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Nombre Completo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Cargo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Área</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedEmployees.map((employee) => (
              <TableRow key={employee.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell>{employee.codigo_empleado}</TableCell>
                <TableCell>{formatFullName(employee)}</TableCell>
                <TableCell>{employee.cargo || 'N/A'}</TableCell>
                <TableCell>{employee.area || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={employee.activo ? 'Activo' : 'Inactivo'}
                    color={employee.activo ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 'medium' }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <Tooltip title="Ver Detalle">
                      <IconButton color="primary" onClick={() => onView(employee)} size="small">
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton color="info" onClick={() => onEdit(employee)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar (Desactivar)">
                      <IconButton
                        color="error"
                        onClick={() => onDelete(employee)}
                        disabled={!employee.activo}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={employees.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </Paper>
  );
};

export default EmployeeTable;
