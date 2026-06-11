import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import EmployeeListPage from '../features/empleados/pages/EmployeeListPage';
import EmployeeDetailPage from '../features/empleados/pages/EmployeeDetailPage';
import { RecognitionPage } from '../features/facial-recognition/pages/RecognitionPage';
import { AttendancePage } from '../features/asistencia/pages/AttendancePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <DashboardPage />,
      },
      {
        path: 'empleados',
        element: <EmployeeListPage />,
      },
      {
        path: 'empleados/:id',
        element: <EmployeeDetailPage />,
      },
      {
        path: 'reconocimiento',
        element: <RecognitionPage />,
      },
      {
        path: 'asistencias',
        element: <AttendancePage />,
      },
    ],
  },
]);
