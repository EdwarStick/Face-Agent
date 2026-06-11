import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { useAttendance, useAttendanceDetail } from '../hooks/useAttendance';
import { useAttendanceFilters } from '../hooks/useAttendanceFilters';
import { AttendanceFilters } from '../components/AttendanceFilters';
import { AttendanceSummaryCards } from '../components/AttendanceSummaryCards';
import { AttendanceTable } from '../components/AttendanceTable';
import { AttendanceDetailModal } from '../components/AttendanceDetailModal';
import type { AttendanceRecord } from '../types/attendance.types';

export function AttendancePage() {
  const { filters, setFilter, resetFilters, hasActiveFilters } = useAttendanceFilters();
  const { data, pagination, loading, error, summary, setPage, setLimit } = useAttendance(filters);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const { detail, loading: detailLoading, error: detailError } = useAttendanceDetail(selectedRecord);

  const handleRowClick = useCallback((record: AttendanceRecord) => {
    setSelectedRecord(record);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedRecord(null);
  }, []);

  return (
    <Box>
      <Typography variant="h4" color="text.primary" sx={{ fontWeight: 'bold', mb: 2 }}>
        Panel de Asistencia
      </Typography>

      <Stack spacing={3}>
        <AttendanceSummaryCards summary={summary} />

        <AttendanceFilters
          filters={filters}
          onFilterChange={setFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AttendanceTable
            data={data}
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onRowClick={handleRowClick}
          />
        )}
      </Stack>

      <AttendanceDetailModal
        open={selectedRecord !== null}
        onClose={handleCloseDetail}
        detail={detail}
        loading={detailLoading}
        error={detailError}
      />
    </Box>
  );
}
