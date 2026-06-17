import { useState, useEffect, useCallback } from 'react';
import { reporteService } from '../services/reporteService';
import type { ResumenDiario, AsistenciasHoy, EstadisticasEmpleado } from '../types';
import { parseError } from '../../../utils/errorParser';

export const useReportes = () => {
  const [resumen, setResumen] = useState<ResumenDiario | null>(null);
  const [asistencias, setAsistencias] = useState<AsistenciasHoy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumenData, asistenciasData] = await Promise.all([
        reporteService.getResumenDiario(),
        reporteService.getAsistenciasHoy(),
      ]);
      setResumen(resumenData);
      setAsistencias(asistenciasData);
    } catch (err) {
      setError(parseError(err, 'Error al cargar los reportes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { resumen, asistencias, loading, error, refetch: fetchAll };
};

export const useEstadisticasEmpleado = (empleadoId: string | null) => {
  const [estadisticas, setEstadisticas] = useState<EstadisticasEmpleado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstadisticas = useCallback(async () => {
    if (!empleadoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await reporteService.getEstadisticasEmpleado(empleadoId);
      setEstadisticas(data);
    } catch (err) {
      setError(parseError(err, 'Error al cargar estadísticas del empleado'));
    } finally {
      setLoading(false);
    }
  }, [empleadoId]);

  useEffect(() => {
    fetchEstadisticas();
  }, [fetchEstadisticas]);

  return { estadisticas, loading, error, refetch: fetchEstadisticas };
};
