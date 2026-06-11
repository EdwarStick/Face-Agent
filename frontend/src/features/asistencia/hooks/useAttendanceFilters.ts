import { useState, useCallback } from 'react';
import type { AttendanceFiltersState } from '../types/attendance.types';
import { DEFAULT_FILTERS } from '../types/attendance.types';

export function useAttendanceFilters() {
  const [filters, setFilters] = useState<AttendanceFiltersState>({ ...DEFAULT_FILTERS });

  const setFilter = useCallback(<K extends keyof AttendanceFiltersState>(
    key: K,
    value: AttendanceFiltersState[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const hasActiveFilters = filters.nombre !== '' || filters.documento !== '' || filters.fecha !== '' || filters.desde !== '' || filters.hasta !== '';

  return { filters, setFilter, resetFilters, hasActiveFilters };
}
