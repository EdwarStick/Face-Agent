export const employeeValidationRules = {
  codigo_empleado: {
    required: 'El código de empleado o documento es obligatorio',
    minLength: { value: 3, message: 'Debe tener al menos 3 caracteres' },
  },
  prim_nombre: {
    required: 'El primer nombre es obligatorio',
    minLength: { value: 2, message: 'Debe tener al menos 2 caracteres' },
  },
  prim_apellido: {
    required: 'El primer apellido es obligatorio',
    minLength: { value: 2, message: 'Debe tener al menos 2 caracteres' },
  },
  correo: {
    pattern: {
      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      message: 'Correo electrónico inválido',
    },
  },
  telefono: {
    pattern: {
      value: /^\+?[0-9]{7,15}$/,
      message: 'Teléfono inválido (debe tener entre 7 y 15 dígitos)',
    },
  },
};
