import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Alert, Container } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useEmployeeDetail } from '../hooks/useEmployees';
import EmployeeDetailCard from '../components/EmployeeDetailCard';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee, loading, error } = useEmployeeDetail(id);

  const handleBack = () => {
    navigate('/empleados');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Volver a la Lista
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && employee && (
        <EmployeeDetailCard employee={employee} />
      )}
    </Container>
  );
};

export default EmployeeDetailPage;
