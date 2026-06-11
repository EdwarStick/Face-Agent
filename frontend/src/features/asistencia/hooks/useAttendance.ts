import { useState, useEffect, useCallback, useMemo } from 'react';
import { attendanceService } from '../services/attendanceService';
import { parseError } from '../../../utils/errorParser';
import type {
  AttendanceRecord,
  AttendanceDetail,
  AttendancePagination,
  AttendanceFiltersState,
  AttendanceStatus,
  DashboardSummary,
  EmpleadoApiItem,
  AsistenciaFullApiItem,
  AsistenciaListApiItem,
} from '../types/attendance.types';
import { DEFAULT_PAGINATION } from '../types/attendance.types';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

interface AttendanceInfo {
  id: string;
  hasEntry: boolean;
  hasExit: boolean;
  horaEntrada: string | null;
  horaSalida: string | null;
  horasTrabajadas: number | null;
}

function buildInfoFromFull(item: AsistenciaFullApiItem): AttendanceInfo {
  return {
    id: item.id,
    hasEntry: true,
    hasExit: item.hora_salida !== null,
    horaEntrada: item.hora_entrada,
    horaSalida: item.hora_salida,
    horasTrabajadas: item.horas_trabajadas,
  };
}

function buildInfoFromList(
  items: AsistenciaListApiItem[],
): AttendanceInfo | null {
  if (items.length === 0) return null;
  const hasExit = items.some((i) => i.tipo === 'salida');
  const entry = items.find((i) => i.tipo === 'entrada');
  const latest = items[items.length - 1];
  return {
    id: latest.id,
    hasEntry: true,
    hasExit,
    horaEntrada: entry?.fecha_marcacion ?? null,
    horaSalida: null,
    horasTrabajadas: null,
  };
}

function computeStatus(info: AttendanceInfo | null): AttendanceStatus {
  if (!info) return 'ausente';
  if (info.hasExit) return 'presente';
  return 'pendiente_salida';
}

function buildRecord(
  emp: EmpleadoApiItem,
  info: AttendanceInfo | null,
  fecha: string,
): AttendanceRecord {
  const status = computeStatus(info);
  return {
    id: info?.id ?? `ausente-${emp.id}`,
    empleado_id: emp.id,
    empleado_nombre: `${emp.prim_nombre} ${emp.prim_apellido}`,
    documento: emp.codigo_empleado,
    cargo: emp.cargo,
    fecha,
    hora_entrada: info?.horaEntrada ?? null,
    hora_salida: info?.horaSalida ?? null,
    tiempo_trabajado: info?.horasTrabajadas ?? null,
    estado: status,
  };
}

function isToday(dateStr: string): boolean {
  return dateStr === todayStr();
}

function isAusente(record: AttendanceRecord): boolean {
  return record.estado === 'ausente';
}

export function useAttendance(filters: AttendanceFiltersState) {
  const [employees, setEmployees] = useState<EmpleadoApiItem[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Map<string, AttendanceInfo>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<AttendancePagination>({
    ...DEFAULT_PAGINATION,
  });

  const { nombre, documento, fecha, desde, hasta } = filters;

  const resolvedDate = fecha || todayStr();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const emps = await attendanceService.getAllEmployees();
      setEmployees(emps);

      const hasDateRange = Boolean(desde || hasta);
      const useFullEndpoint = isToday(resolvedDate) && !hasDateRange;

      let infoMap = new Map<string, AttendanceInfo>();

      if (useFullEndpoint) {
        const hoy = await attendanceService.getTodayAttendance();
        for (const item of hoy) {
          infoMap.set(item.empleado_id, buildInfoFromFull(item));
        }
      } else {
        const recent = await attendanceService.getRecentAttendance(100);
        const filtered = recent.filter((r) => {
          const d = r.fecha_marcacion.split('T')[0];
          if (fecha) return d === fecha;
          if (desde && d < desde) return false;
          if (hasta && d > hasta) return false;
          return true;
        });
        const grouped = new Map<string, AsistenciaListApiItem[]>();
        for (const item of filtered) {
          const list = grouped.get(item.empleado_id) ?? [];
          list.push(item);
          grouped.set(item.empleado_id, list);
        }
        for (const [empId, items] of grouped) {
          const info = buildInfoFromList(items);
          if (info) infoMap.set(empId, info);
        }
      }

      setAttendanceMap(infoMap);
    } catch (err: unknown) {
      const message = parseError(err, 'Error al cargar los datos de asistencia.');
      setError(message);
      setEmployees([]);
      setAttendanceMap(new Map());
    } finally {
      setLoading(false);
    }
  }, [resolvedDate, fecha, desde, hasta]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const allRecords = useMemo<AttendanceRecord[]>(() => {
    const date = fecha || todayStr();
    return employees.map((emp) =>
      buildRecord(emp, attendanceMap.get(emp.id) ?? null, date),
    );
  }, [employees, attendanceMap, fecha]);

  const filtered = useMemo<AttendanceRecord[]>(() => {
    return allRecords.filter((r) => {
      if (nombre) {
        const q = nombre.toLowerCase();
        if (!r.empleado_nombre.toLowerCase().includes(q)) return false;
      }
      if (documento) {
        const q = documento.toLowerCase();
        if (!r.documento.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allRecords, nombre, documento]);

  const summary = useMemo<DashboardSummary>(() => {
    let presentes = 0;
    let ausentes = 0;
    let pendientes = 0;
    for (const r of filtered) {
      if (r.estado === 'presente') presentes++;
      else if (r.estado === 'ausente') ausentes++;
      else pendientes++;
    }
    return {
      total: filtered.length,
      presentes,
      ausentes,
      pendientes,
    };
  }, [filtered]);

  const displayData = useMemo<AttendanceRecord[]>(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filtered.slice(start, start + pagination.limit);
  }, [filtered, pagination.page, pagination.limit]);

  const totalPagination: AttendancePagination = {
    ...pagination,
    total: filtered.length,
  };

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  return {
    data: displayData,
    pagination: totalPagination,
    loading,
    error,
    summary,
    setPage,
    setLimit,
    refetch: fetchAll,
  };
}

function buildDetail(
  record: AttendanceRecord,
  full: AsistenciaFullApiItem,
): AttendanceDetail {
  return {
    ...record,
    hora_entrada: full.hora_entrada ?? record.hora_entrada,
    hora_salida: full.hora_salida,
    tiempo_trabajado: full.horas_trabajadas,
    estado:
      full.estado === 'presente' ||
      full.estado === 'ausente' ||
      full.estado === 'pendiente_salida'
        ? full.estado
        : record.estado,
  };
}

export function useAttendanceDetail(record: AttendanceRecord | null) {
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record) {
      setDetail(null);
      return;
    }

    if (isAusente(record)) {
      setDetail(record);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    attendanceService
      .getRecordsByEmployee(record.empleado_id)
      .then((records: AsistenciaFullApiItem[]) => {
        if (cancelled) return;
        const match = records.find((r) => r.id === record.id);
        if (match) {
          setDetail(buildDetail(record, match));
        } else {
          setDetail(record);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = parseError(err, 'Error al cargar el detalle de la asistencia.');
        setError(message);
        setDetail(record);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [record]);

  return { detail, loading, error };
}
