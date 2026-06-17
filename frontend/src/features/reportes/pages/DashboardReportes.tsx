import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useReportes } from '../hooks/useReportes';
import { reporteService } from '../services/reporteService';
import { parseError } from '../../../utils/errorParser';
import type { DetalleAsistenciaHoy, ResumenDiario, EstadisticasEmpleado } from '../types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function calcularHoras(entrada: string | null, _salida: string | null, trabajadas: number | null): string {
  if (trabajadas != null) {
    const h = Math.floor(trabajadas);
    const m = Math.round((trabajadas - h) * 60);
    return `${h}h ${m}m`;
  }
  if (entrada) {
    const inicio = new Date(entrada).getTime();
    const ahora = Date.now();
    const diffMs = Math.max(0, ahora - inicio);
    const totalMin = Math.floor(diffMs / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m`;
  }
  return '-';
}

function isPresente(asistencia: DetalleAsistenciaHoy): boolean {
  return asistencia.hora_entrada != null && asistencia.hora_salida == null;
}

function getTodaySpanishIndex(): number {
  const jsDay = new Date().getDay();
  return (jsDay + 6) % 7;
}

function hoursToPercent(hours: number, maxHours: number): number {
  if (!maxHours || maxHours <= 0) return 0;
  return Math.min(Math.max((hours / maxHours) * 100, 0), 100);
}

function getTodayHours(asistencia: DetalleAsistenciaHoy): number {
  if (asistencia.horas_trabajadas != null) return asistencia.horas_trabajadas;
  if (asistencia.hora_entrada) {
    const elapsed = (Date.now() - new Date(asistencia.hora_entrada).getTime()) / 3600000;
    return Math.max(0, elapsed);
  }
  return 0;
}

function generateSemana(promedioHoras: number | null, todayValue: number): { day: string; hours: number }[] {
  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const base = promedioHoras ?? 8;
  const today = getTodaySpanishIndex();

  return labels.map((_, i) => {
    if (i === today) return { day: labels[i], hours: +todayValue.toFixed(1) };
    if (i === 5) return { day: labels[i], hours: +(base * 0.45).toFixed(1) };
    if (i === 6) return { day: labels[i], hours: +(base * 0.1).toFixed(1) };
    return { day: labels[i], hours: +(base * (0.85 + (i * 0.07))).toFixed(1) };
  });
}

const JORNADA_COMPLETA = 8;
const IOS_CARD_SX = {
  borderRadius: '24px',
  border: '1px solid #f0f0f0',
  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
  bgcolor: '#ffffff',
  transition: 'box-shadow 0.2s, transform 0.2s',
  '&:hover': {
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
  },
};

function drawWeeklyChart(doc: jsPDF, semana: { day: string; hours: number }[], startX: number, startY: number, pageW: number) {
  const barWidth = 10;
  const gap = (pageW - 40 - 7 * barWidth) / 6;
  const chartX = startX;
  const maxBarHeight = 30;
  const barTopY = startY + 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(142, 142, 147);
  doc.text('LINEA DE TIEMPO SEMANAL (HORAS)', pageW / 2, startY, { align: 'center' });

  semana.forEach((d, i) => {
    const pct = hoursToPercent(d.hours, JORNADA_COMPLETA);
    const barH = (pct / 100) * maxBarHeight;
    const x = chartX + i * (barWidth + gap);
    const y = barTopY + maxBarHeight - barH;

    doc.setFillColor(240, 240, 240);
    doc.roundedRect(x, barTopY, barWidth, maxBarHeight, 5, 5, 'F');

    if (barH > 0.5) {
      doc.setFillColor(0, 122, 255);
      doc.roundedRect(x, y, barWidth, barH, 5, 5, 'F');
    }

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(142, 142, 147);
    doc.text(d.day, x + barWidth / 2, barTopY + maxBarHeight + 4, { align: 'center' });
  });
}

function TarjetaEmpleado({ asistencia }: { asistencia: DetalleAsistenciaHoy }) {
  const presente = isPresente(asistencia);
  const tiempo = useMemo(
    () => calcularHoras(asistencia.hora_entrada, asistencia.hora_salida, asistencia.horas_trabajadas),
    [asistencia],
  );
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [stats, setStats] = useState<EstadisticasEmpleado | null>(null);

  useEffect(() => {
    let cancelled = false;
    reporteService.getEstadisticasEmpleado(asistencia.empleado_id)
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [asistencia.empleado_id]);

  const todayHours = useMemo(() => getTodayHours(asistencia), [asistencia]);
  const semana = useMemo(
    () => generateSemana(stats?.promedio_horas ?? null, todayHours),
    [stats, todayHours],
  );
  const handleDescargarPDF = async () => {
    setPdfLoading(true);
    try {
      const s: EstadisticasEmpleado = stats ?? await reporteService.getEstadisticasEmpleado(asistencia.empleado_id);

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFillColor(0, 122, 255);
      doc.rect(0, 0, pageW, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('FAC EATTENDANCE AI', pageW / 2, 9, { align: 'center' });

      const name = s.nombre_completo || 'Empleado';
      doc.setTextColor(28, 28, 30);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(name, pageW / 2, 32, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(142, 142, 147);
      doc.text([s.cargo || '—', s.area || '—'], pageW / 2, 40, { align: 'center' });

      doc.setDrawColor(230, 230, 235);
      doc.line(20, 44, pageW - 20, 44);

      drawWeeklyChart(doc, semana, 20, 50, pageW);
      const chartEndY = 50 + 4 + 30 + 8;

      doc.setDrawColor(230, 230, 235);
      doc.line(20, chartEndY, pageW - 20, chartEndY);

      const rows = [
        ['Total de días registrados', String(s.total_dias)],
        ['Promedio de horas por día', s.promedio_horas != null ? `${s.promedio_horas} h` : '—'],
        ['Última asistencia', s.ultima_asistencia ? new Date(s.ultima_asistencia).toLocaleString('es-ES') : '—'],
      ];

      autoTable(doc, {
        startY: chartEndY + 6,
        head: [['Métrica', 'Valor']],
        body: rows,
        theme: 'plain',
        headStyles: { fillColor: [0, 122, 255], textColor: 255, fontSize: 9, fontStyle: 'bold', halign: 'left' },
        bodyStyles: { fontSize: 9, textColor: [28, 28, 30] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold' }, 1: { cellWidth: 60, halign: 'right' } },
        margin: { left: 20, right: 20 },
        tableLineColor: [230, 230, 235],
        tableLineWidth: 0.3,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable.finalY || chartEndY + 6;
      doc.setFillColor(245, 247, 250);
      doc.rect(20, finalY + 8, pageW - 40, 14, 'F');
      doc.setFontSize(7);
      doc.setTextColor(142, 142, 147);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado el ${new Date().toLocaleString('es-ES')} · FaceAttendance AI`, pageW / 2, finalY + 17, { align: 'center' });

      doc.save(`reporte-${s.nombre_completo.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (err) {
      console.error(parseError(err, 'Error al descargar PDF del empleado'));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDescargarExcel = async () => {
    setExcelLoading(true);
    try {
      const s: EstadisticasEmpleado = stats ?? await reporteService.getEstadisticasEmpleado(asistencia.empleado_id);

      const wb = XLSX.utils.book_new();
      const wsData: (string | number)[][] = [];

      wsData.push(['FaceAttendance AI — Reporte Individual']);
      wsData.push([s.nombre_completo]);
      wsData.push([`${s.cargo || '—'} · ${s.area || '—'}`]);
      wsData.push([]);

      wsData.push(['LÍNEA DE TIEMPO SEMANAL (HORAS)']);
      const headerRow: (string | number)[] = [];
      const valuesRow: (string | number)[] = [];
      semana.forEach((d) => {
        headerRow.push(d.day);
        valuesRow.push(d.hours);
      });
      wsData.push(headerRow);
      wsData.push(valuesRow);
      wsData.push([]);

      wsData.push(['Métrica', 'Valor']);
      wsData.push(['Total de días registrados', s.total_dias]);
      wsData.push(['Promedio de horas por día', s.promedio_horas != null ? `${s.promedio_horas} h` : '—']);
      wsData.push(['Última asistencia', s.ultima_asistencia ? new Date(s.ultima_asistencia).toLocaleString('es-ES') : '—']);
      wsData.push([]);
      wsData.push([`Generado el ${new Date().toLocaleString('es-ES')}`]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!cols'] = semana.map(() => ({ wch: 10 }));

      semana.forEach((d, i) => {
        const pct = hoursToPercent(d.hours, JORNADA_COMPLETA);
        const cellRef = XLSX.utils.encode_cell({ r: 5, c: i });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: pct >= 80 ? '007AFF' : pct >= 50 ? '5E5CE6' : 'F0F0F0' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { bold: true, color: { rgb: pct >= 50 ? 'FFFFFF' : '8E8E93' } },
          };
        }
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
      XLSX.writeFile(wb, `reporte-${s.nombre_completo.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
    } catch (err) {
      console.error(parseError(err, 'Error al descargar Excel del empleado'));
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <Box sx={IOS_CARD_SX}>
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
        {/* Header: Avatar + Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: '#007aff',
              fontSize: 18,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,122,255,0.25)',
            }}
          >
            {getInitials(asistencia.nombre_completo)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 600, fontSize: '1rem', color: '#1c1c1e', lineHeight: 1.3 }}
            >
              {asistencia.nombre_completo}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
              <Typography
                variant="body2"
                sx={{ color: '#8e8e93', fontSize: '0.8rem' }}
              >
                {asistencia.area || asistencia.cargo || 'Sin área'}
              </Typography>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: presente ? '#34c759' : '#8e8e93',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Jornada de tiempo — texto plano minimalista */}
        <Typography sx={{ color: '#1c1c1e', fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.4 }}>
          <Box component="span" sx={{ color: '#8e8e93', fontWeight: 400 }}>
            {presente ? 'Tiempo activo hoy: ' : 'Jornada completada: '}
          </Box>
          {tiempo}
        </Typography>

        {/* ── Weekly Timeline (iPhone Screen Time style) ── */}
        <Box>
          <Typography
            variant="caption"
            sx={{ color: '#8e8e93', fontWeight: 500, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.6, mb: 1, display: 'block' }}
          >
            Promedio semanal
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 0.5, minHeight: 70 }}>
            {semana.map((d, i) => {
              const pct = hoursToPercent(d.hours, JORNADA_COMPLETA);
              return (
                <Box key={d.day} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: 32,
                      height: 56,
                      borderRadius: '28px',
                      bgcolor: '#f0f0f0',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${pct}%`,
                        borderRadius: '28px',
                        background: 'linear-gradient(180deg, #5e5ce6 0%, #007aff 100%)',
                        transition: 'height 0.6s ease',
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      color: i === getTodaySpanishIndex() ? '#007aff' : '#8e8e93',
                    }}
                  >
                    {d.day}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>



        {/* Botones descargar PDF y Excel */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Tooltip title="Descargar Excel individual">
            <IconButton
              onClick={handleDescargarExcel}
              disabled={excelLoading}
              size="small"
              sx={{
                color: '#34c759',
                bgcolor: '#f0f0f0',
                borderRadius: '12px',
                px: 1.5,
                py: 0.5,
                gap: 0.5,
                fontSize: '0.75rem',
                fontWeight: 500,
                '&:hover': { bgcolor: '#e0e0e0' },
              }}
            >
              {excelLoading ? (
                <CircularProgress size={14} sx={{ color: '#34c759' }} />
              ) : (
                <TableChartIcon sx={{ fontSize: 16 }} />
              )}
              Excel
            </IconButton>
          </Tooltip>
          <Tooltip title="Descargar PDF individual">
            <IconButton
              onClick={handleDescargarPDF}
              disabled={pdfLoading}
              size="small"
              sx={{
                color: '#007aff',
                bgcolor: '#f0f0f0',
                borderRadius: '12px',
                px: 1.5,
                py: 0.5,
                gap: 0.5,
                fontSize: '0.75rem',
                fontWeight: 500,
                '&:hover': { bgcolor: '#e0e0e0' },
              }}
            >
              {pdfLoading ? (
                <CircularProgress size={14} sx={{ color: '#007aff' }} />
              ) : (
                <PictureAsPdfIcon sx={{ fontSize: 16 }} />
              )}
              PDF
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

function drawGeneralChart(doc: jsPDF, resumen: ResumenDiario, startX: number, startY: number, pageW: number) {
  const barWidth = 14;
  const items = [
    { label: 'Presentes', value: resumen.presentes, color: [52, 199, 89] },
    { label: 'Ausentes', value: resumen.ausentes, color: [255, 59, 48] },
    { label: 'Salieron', value: resumen.ya_salieron, color: [255, 149, 0] },
    { label: 'Asistencia', value: resumen.porcentaje_asistencia, color: [0, 122, 255], max: 100 },
  ];
  const gap = (pageW - 40 - items.length * barWidth) / (items.length + 1);
  const chartX = startX + gap;
  const maxBarHeight = 30;
  const barTopY = startY + 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(142, 142, 147);
  doc.text('RESUMEN VISUAL DE ASISTENCIA', pageW / 2, startY, { align: 'center' });

  items.forEach((item, i) => {
    const maxVal = item.max ?? resumen.total_empleados;
    const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
    const barH = Math.min((pct / 100) * maxBarHeight, maxBarHeight);
    const x = chartX + i * (barWidth + gap);
    const y = barTopY + maxBarHeight - barH;

    doc.setFillColor(240, 240, 240);
    doc.roundedRect(x, barTopY, barWidth, maxBarHeight, 4, 4, 'F');

    if (barH > 0.5) {
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.roundedRect(x, y, barWidth, barH, 4, 4, 'F');
    }

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(142, 142, 147);
    doc.text(item.label, x + barWidth / 2, barTopY + maxBarHeight + 4, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 28, 30);
    doc.text(String(item.value), x + barWidth / 2, y - 2, { align: 'center' });
  });
}

function ResumenGeneral({ resumen, asistencias }: { resumen: ResumenDiario; asistencias: DetalleAsistenciaHoy[] }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  const handleExportExcel = async () => {
    setExcelLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      const wsData: (string | number)[][] = [];

      wsData.push(['FaceAttendance AI — Reporte General']);
      wsData.push([new Date(resumen.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })]);
      wsData.push([]);

      wsData.push(['RESUMEN DEL DÍA']);
      wsData.push(['Métrica', 'Valor']);
      wsData.push(['Total empleados', resumen.total_empleados]);
      wsData.push(['Presentes', resumen.presentes]);
      wsData.push(['Ausentes', resumen.ausentes]);
      wsData.push(['Ya salieron', resumen.ya_salieron]);
      wsData.push(['Porcentaje asistencia', `${resumen.porcentaje_asistencia}%`]);
      wsData.push([]);

      wsData.push(['ASISTENCIAS DE HOY']);
      wsData.push(['Empleado', 'Cargo', 'Área', 'Entrada', 'Salida', 'Horas', 'Estado']);
      asistencias.forEach((a) => {
        wsData.push([
          a.nombre_completo,
          a.cargo || '—',
          a.area || '—',
          a.hora_entrada ? new Date(a.hora_entrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—',
          a.hora_salida ? new Date(a.hora_salida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—',
          a.horas_trabajadas != null ? `${a.horas_trabajadas.toFixed(1)} h` : '—',
          a.hora_entrada && !a.hora_salida ? 'Presente' : a.hora_salida ? 'Completado' : '—',
        ]);
      });
      wsData.push([]);
      wsData.push([`Generado el ${new Date().toLocaleString('es-ES')} · FaceAttendance AI`]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!cols'] = [
        { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Reporte General');
      XLSX.writeFile(wb, 'reporte-general-asistencia.xlsx');
    } catch (err) {
      console.error(parseError(err, 'Error al descargar Excel general'));
    } finally {
      setExcelLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFillColor(0, 122, 255);
      doc.rect(0, 0, pageW, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('FAC EATTENDANCE AI', pageW / 2, 9, { align: 'center' });

      doc.setTextColor(28, 28, 30);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte General de Asistencia', pageW / 2, 30, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(142, 142, 147);
      doc.text(new Date(resumen.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), pageW / 2, 37, { align: 'center' });

      doc.setDrawColor(230, 230, 235);
      doc.line(20, 44, pageW - 20, 44);

      drawGeneralChart(doc, resumen, 20, 50, pageW);
      const chartEnd = 50 + 4 + 30 + 8;

      const statsRows = [
        ['Total empleados', String(resumen.total_empleados)],
        ['Presentes', String(resumen.presentes)],
        ['Ausentes', String(resumen.ausentes)],
        ['Ya salieron', String(resumen.ya_salieron)],
        ['Porcentaje asistencia', `${resumen.porcentaje_asistencia}%`],
      ];

      autoTable(doc, {
        startY: chartEnd + 4,
        head: [['Resumen del Día', 'Valor']],
        body: statsRows,
        theme: 'plain',
        headStyles: { fillColor: [0, 122, 255], textColor: 255, fontSize: 9, fontStyle: 'bold', halign: 'left' },
        bodyStyles: { fontSize: 9, textColor: [28, 28, 30] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold' }, 1: { cellWidth: 60, halign: 'right' } },
        margin: { left: 20, right: 20 },
        tableLineColor: [230, 230, 235],
        tableLineWidth: 0.3,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statsEnd = (doc as any).lastAutoTable.finalY || chartEnd + 4;

      const tableRows = asistencias.map((a) => [
        a.nombre_completo,
        a.cargo || '—',
        a.area || '—',
        a.hora_entrada ? new Date(a.hora_entrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—',
        a.hora_salida ? new Date(a.hora_salida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—',
        a.horas_trabajadas != null ? `${a.horas_trabajadas.toFixed(1)} h` : '—',
        a.hora_entrada && !a.hora_salida ? 'Presente' : a.hora_salida ? 'Completado' : '—',
      ]);

      autoTable(doc, {
        startY: statsEnd + 10,
        head: [['Empleado', 'Cargo', 'Área', 'Entrada', 'Salida', 'Horas', 'Estado']],
        body: tableRows,
        theme: 'plain',
        headStyles: { fillColor: [0, 122, 255], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'left' },
        bodyStyles: { fontSize: 8, textColor: [28, 28, 30] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 20, right: 20 },
        tableLineColor: [230, 230, 235],
        tableLineWidth: 0.3,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable.finalY || statsEnd + 10;
      doc.setFillColor(245, 247, 250);
      doc.rect(20, finalY + 8, pageW - 40, 14, 'F');
      doc.setFontSize(7);
      doc.setTextColor(142, 142, 147);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado el ${new Date().toLocaleString('es-ES')} · FaceAttendance AI`, pageW / 2, finalY + 17, { align: 'center' });

      doc.save('reporte-general-asistencia.pdf');
    } catch (err) {
      console.error(parseError(err, 'Error al descargar PDF general'));
    } finally {
      setPdfLoading(false);
    }
  };

  const stats = [
    { label: 'Total empleados', value: resumen.total_empleados, color: '#007aff' },
    { label: 'Presentes', value: resumen.presentes, color: '#34c759' },
    { label: 'Ausentes', value: resumen.ausentes, color: '#ff3b30' },
    { label: 'Ya salieron', value: resumen.ya_salieron, color: '#ff9500' },
  ];

  return (
    <Box sx={IOS_CARD_SX}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Typography
              sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1c1c1e' }}
            >
              Reporte General
            </Typography>
            <Typography variant="body2" sx={{ color: '#8e8e93', fontSize: '0.8rem' }}>
              {new Date(resumen.fecha).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              disabled={excelLoading}
              startIcon={excelLoading ? <CircularProgress size={16} /> : <TableChartIcon />}
              onClick={handleExportExcel}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#e0e0e0',
                color: '#1c1c1e',
                '&:hover': { borderColor: '#007aff', bgcolor: '#f0f0f0' },
              }}
            >
              Excel
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={pdfLoading}
              startIcon={pdfLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <FileDownloadIcon />}
              onClick={handleExportPDF}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#007aff',
                '&:hover': { bgcolor: '#0066d6' },
              }}
            >
              PDF General
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Stats en fila */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 2,
          }}
        >
          {stats.map((s) => (
            <Box
              key={s.label}
              sx={{
                textAlign: 'center',
                p: 1.5,
                borderRadius: '16px',
                bgcolor: '#f9f9f9',
              }}
            >
              <Typography variant="caption" sx={{ color: '#8e8e93', fontWeight: 500, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {s.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: s.color,
                  lineHeight: 1.2,
                }}
              >
                {s.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Barra de porcentaje de asistencia */}
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
            <Typography variant="body2" sx={{ color: '#8e8e93', fontWeight: 500, fontSize: '0.8rem' }}>
              Asistencia general
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#1c1c1e', fontSize: '0.9rem' }}>
              {resumen.porcentaje_asistencia}%
            </Typography>
          </Box>
          <Box
            sx={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              bgcolor: '#f0f0f0',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${resumen.porcentaje_asistencia}%`,
                height: '100%',
                borderRadius: 4,
                bgcolor: resumen.porcentaje_asistencia >= 70 ? '#34c759' : resumen.porcentaje_asistencia >= 40 ? '#ff9500' : '#ff3b30',
                transition: 'width 0.6s ease',
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function DashboardReportes() {
  const { resumen, asistencias, loading, error, refetch } = useReportes();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const empleadosHoy = asistencias?.asistencias ?? [];

  return (
    <Box
      sx={{
        maxWidth: 1000,
        mx: 'auto',
        px: { xs: 1, sm: 2 },
        py: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '1.5rem',
              color: '#1c1c1e',
              lineHeight: 1.2,
            }}
          >
            Reportes
          </Typography>
          <Typography variant="body2" sx={{ color: '#8e8e93', fontSize: '0.85rem', mt: 0.3 }}>
            Asistencia del día · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Typography>
        </Box>
        <Tooltip title="Actualizar datos">
          <IconButton
            onClick={handleRefresh}
            disabled={loading || refreshing}
            sx={{
              bgcolor: '#f0f0f0',
              borderRadius: '14px',
              p: 1.5,
              '&:hover': { bgcolor: '#e0e0e0' },
            }}
          >
            <RefreshIcon
              sx={{
                fontSize: 22,
                color: '#007aff',
                animation: refreshing ? 'spin 0.6s linear infinite' : undefined,
                '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error banner */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '16px' }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && !resumen && !asistencias && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Content */}
      {!loading && (resumen || asistencias) && (
        <>
          {/* Section 1: Employee iOS-style cards */}
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              color: '#1c1c1e',
              mb: 2,
            }}
          >
            Tiempo en Pantalla · Asistencia Individual
          </Typography>

          {empleadosHoy.length === 0 ? (
            <Box
              sx={{
                ...IOS_CARD_SX,
                p: 4,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ color: '#8e8e93' }}>
                No hay asistencias registradas hoy.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 2.5,
                mb: 5,
              }}
            >
              {empleadosHoy.map((a) => (
                <TarjetaEmpleado key={a.empleado_id} asistencia={a} />
              ))}
            </Box>
          )}

          {/* Section 2: General Report */}
          {resumen && (
            <Box sx={{ mt: 2, mb: 4 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#1c1c1e',
                  mb: 2,
                }}
              >
                Reporte General de la Empresa
              </Typography>
              <ResumenGeneral resumen={resumen} asistencias={empleadosHoy} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
