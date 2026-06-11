import { useState, useEffect, useCallback } from 'react';
import { employeeService } from '../services/employeeService';
import type { EmpleadoResponse, EmpleadoCreate, EmpleadoUpdate } from '../types';
import { parseError } from '../../../utils/errorParser';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<EmpleadoResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      setError(parseError(err, 'Error al obtener empleados'));
    } finally {
      setLoading(false);
    }
  }, []);

  const createEmployee = async (data: EmpleadoCreate) => {
    setLoading(true);
    setError(null);
    try {
      const newEmployee = await employeeService.createEmployee(data);
      setEmployees((prev) => [...prev, newEmployee]);
      return newEmployee;
    } catch (err: any) {
      const msg = parseError(err, 'Error al crear empleado');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateEmployee = async (id: string, data: EmpleadoUpdate) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await employeeService.updateEmployee(id, data);
      setEmployees((prev) => prev.map((emp) => (emp.id === id ? updated : emp)));
      return updated;
    } catch (err: any) {
      const msg = parseError(err, 'Error al actualizar empleado');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await employeeService.deleteEmployee(id);
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === id ? { ...emp, activo: false } : emp))
      );
    } catch (err: any) {
      const msg = parseError(err, 'Error al eliminar empleado');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
};

export const useEmployeeDetail = (id?: string) => {
  const [employee, setEmployee] = useState<EmpleadoResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getEmployee(id);
      setEmployee(data);
    } catch (err: any) {
      setError(parseError(err, 'Error al obtener el detalle del empleado'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  return {
    employee,
    loading,
    error,
    refetch: fetchEmployee,
  };
};
