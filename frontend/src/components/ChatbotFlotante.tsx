import React, { useCallback, useEffect, useRef, useState } from 'react';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// URL base de la API (VITE_API_URL ya incluye /api/v1)
const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const STORAGE_KEY = 'aria_chat_historial';

interface MensajeChat {
  id: string;
  rol: 'usuario' | 'aria';
  texto: string;
  esBienvenida?: boolean;
}

const MSG_BIENVENIDA =
  '¡Hola! 👋 Soy ARIA, tu asistente de asistencia. Puedes preguntarme cosas como: ¿Quién faltó hoy? ¿Cuántas horas trabajó el equipo esta semana? ¿Quién llegó tarde?';

const SUGERENCIAS = [
  '¿Quién faltó hoy?',
  '¿Quién está presente?',
  '¿Cuántos empleados hay?',
  'Resumen del día',
];

const MSG_SIN_SERVIDOR =
  '😵 No puedo contactar al servidor en este momento. Verifica tu conexión e inténtalo de nuevo.';

// ─────────────────────────────────────────────────────────────────────────────
// Animaciones CSS (se inyectan una sola vez)
// ─────────────────────────────────────────────────────────────────────────────
const ANIMACIONES_CSS = `
@keyframes chat-burbuja-entrada {
  0% { opacity: 0; transform: scale(0); }
  55% { opacity: 1; transform: scale(1.12); }
  75% { transform: scale(0.96); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes chat-ventana {
  from { opacity: 0; transform: translateY(24px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes chat-pulso {
  0%, 100% { box-shadow: 0 4px 18px rgba(37,99,235,0.4); }
  50% { box-shadow: 0 4px 30px rgba(37,99,235,0.8), 0 0 0 10px rgba(37,99,235,0.15); }
}
@keyframes chat-puntos {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Estilos inline
// ─────────────────────────────────────────────────────────────────────────────
const wrapperStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  zIndex: 1300,
  animation: 'chat-burbuja-entrada 0.5s ease-out both',
};

const burbujaStyle: React.CSSProperties = {
  position: 'relative',
  width: 60,
  height: 60,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  boxShadow: '0 4px 18px rgba(37,99,235,0.4)',
};

const burbujaOfflineStyle: React.CSSProperties = {
  background: '#64748b',
  boxShadow: '0 4px 14px rgba(100,116,139,0.4)',
};

const pulsoStyle: React.CSSProperties = {
  animation: 'chat-pulso 1.4s ease-in-out infinite',
};

const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: -2,
  right: -2,
  minWidth: 20,
  height: 20,
  padding: '0 5px',
  borderRadius: 999,
  background: '#ef4444',
  color: '#fff',
  fontSize: '0.7rem',
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '2px solid #fff',
};

const ventanaStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 96,
  right: 24,
  width: 360,
  maxWidth: 'calc(100vw - 48px)',
  height: 480,
  maxHeight: 'calc(100vh - 120px)',
  display: 'flex',
  flexDirection: 'column',
  background: '#ffffff',
  borderRadius: 18,
  boxShadow: '0 16px 50px rgba(0,0,0,0.28)',
  overflow: 'hidden',
  animation: 'chat-ventana 0.28s ease-out both',
  zIndex: 1300,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  color: '#fff',
  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
};

const botonCerrarStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: 4,
  borderRadius: 8,
};

const listaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  background: '#f1f5f9',
};

const filaAriaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 8,
};

const filaUsuarioStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
};

const avatarAriaStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 17,
  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  flexShrink: 0,
};

const burbujaAriaStyle: React.CSSProperties = {
  background: '#334155',
  color: '#f1f5f9',
  borderRadius: '14px 14px 14px 4px',
  padding: '10px 13px',
  fontSize: '0.85rem',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxWidth: '78%',
};

const burbujaUsuarioStyle: React.CSSProperties = {
  background: '#2563eb',
  color: '#fff',
  borderRadius: '14px 14px 4px 14px',
  padding: '10px 13px',
  fontSize: '0.85rem',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxWidth: '78%',
};

const chipsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 8,
};

const chipStyle: React.CSSProperties = {
  background: '#eff6ff',
  color: '#1d4ed8',
  border: '1px solid #bfdbfe',
  borderRadius: 999,
  padding: '5px 11px',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const puntosStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 7,
  height: 7,
  marginRight: 4,
  borderRadius: '50%',
  background: '#94a3b8',
  animation: 'chat-puntos 1.2s ease-in-out infinite',
};

const inputStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 8,
  padding: 12,
  borderTop: '1px solid #e2e8f0',
  background: '#fff',
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '9px 12px',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  resize: 'none',
  outline: 'none',
  maxHeight: 84,
  lineHeight: 1.4,
  color: '#1e293b',
  background: '#f8fafc',
};

const botonEnviarStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Chatbot flotante global
// ─────────────────────────────────────────────────────────────────────────────
export const ChatbotFlotante: React.FC = () => {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>(() => {
    // Cargar historial de sessionStorage (persiste entre rutas, se limpia al cerrar navegador)
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MensajeChat[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // historial corrupto: ignorar
    }
    // Primera vez en la sesión: mensaje de bienvenida
    return [{ id: crypto.randomUUID(), rol: 'aria', texto: MSG_BIENVENIDA, esBienvenida: true }];
  });
  const [texto, setTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [backendDisponible, setBackendDisponible] = useState(true);
  const [sinLeer, setSinLeer] = useState(0);
  const [nuevaRespuesta, setNuevaRespuesta] = useState(false);
  const listaRef = useRef<HTMLDivElement | null>(null);
  const abiertoRef = useRef(false);

  const handleToggle = useCallback(() => {
    const nuevo = !abierto;
    abiertoRef.current = nuevo;
    setAbierto(nuevo);
    if (nuevo) setSinLeer(0);
  }, [abierto]);

  // Guardar historial al cambiar
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes));
    } catch {
      // almacenamiento no disponible: ignorar
    }
  }, [mensajes]);

  // Auto scroll al último mensaje
  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, escribiendo, abierto]);

  const enviar = useCallback(
    async (pregunta: string) => {
      const limpio = pregunta.trim();
      if (!limpio || escribiendo) return;

      setMensajes((m) => [...m, { id: crypto.randomUUID(), rol: 'usuario', texto: limpio }]);
      setTexto('');
      setEscribiendo(true);

      try {
        const response = await fetch(`${API_URL}/chat/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pregunta: limpio }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as { pregunta: string; respuesta: string };
        setBackendDisponible(true);
        setMensajes((m) => [...m, { id: crypto.randomUUID(), rol: 'aria', texto: data.respuesta }]);
        if (!abiertoRef.current) setSinLeer((n) => n + 1);
        setNuevaRespuesta(true);
        window.setTimeout(() => setNuevaRespuesta(false), 2500);
      } catch {
        setBackendDisponible(false);
        setMensajes((m) => [...m, { id: crypto.randomUUID(), rol: 'aria', texto: MSG_SIN_SERVIDOR }]);
      } finally {
        setEscribiendo(false);
      }
    },
    [escribiendo],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void enviar(texto);
    }
  };

  const enviarDisabled = !texto.trim() || escribiendo;

  return (
    <>
      <style>{ANIMACIONES_CSS}</style>

      {/* Ventana del chat */}
      {abierto && (
        <div style={ventanaStyle} role="dialog" aria-label="Chat de ARIA">
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>ARIA - Asistente</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                  {backendDisponible ? '● En línea' : '● Servidor no disponible'}
                </div>
              </div>
            </div>
            <button onClick={() => setAbierto(false)} style={botonCerrarStyle} aria-label="Cerrar chat">
              <CloseIcon sx={{ fontSize: 22 }} />
            </button>
          </div>

          <div ref={listaRef} style={listaStyle}>
            {mensajes.map((msg) =>
              msg.rol === 'aria' ? (
                <div key={msg.id} style={filaAriaStyle}>
                  <div style={avatarAriaStyle}>🤖</div>
                  <div>
                    <div style={burbujaAriaStyle}>{msg.texto}</div>
                    {msg.esBienvenida && (
                      <div style={chipsStyle}>
                        {SUGERENCIAS.map((s) => (
                          <button key={s} style={chipStyle} onClick={() => void enviar(s)}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div key={msg.id} style={filaUsuarioStyle}>
                  <div style={burbujaUsuarioStyle}>{msg.texto}</div>
                </div>
              ),
            )}

            {escribiendo && (
              <div style={filaAriaStyle}>
                <div style={avatarAriaStyle}>🤖</div>
                <div style={burbujaAriaStyle} aria-label="ARIA escribiendo">
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ ...puntosStyle, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={inputStyle}>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              rows={1}
              autoFocus
              style={textareaStyle}
            />
            <button
              onClick={() => void enviar(texto)}
              disabled={enviarDisabled}
              style={{ ...botonEnviarStyle, opacity: enviarDisabled ? 0.5 : 1 }}
              aria-label="Enviar mensaje"
            >
              <SendIcon sx={{ fontSize: 20 }} />
            </button>
          </div>
        </div>
      )}

      {/* Burbuja flotante */}
      <div style={wrapperStyle}>
        <button
          onClick={handleToggle}
          style={{
            ...burbujaStyle,
            ...(backendDisponible ? {} : burbujaOfflineStyle),
            ...(nuevaRespuesta && !abierto ? pulsoStyle : undefined),
          }}
          aria-label={abierto ? 'Cerrar asistente ARIA' : 'Abrir asistente ARIA'}
        >
          {abierto ? (
            <CloseIcon sx={{ fontSize: 28 }} />
          ) : backendDisponible ? (
            <SmartToyIcon sx={{ fontSize: 30 }} />
          ) : (
            <WarningAmberIcon sx={{ fontSize: 28 }} />
          )}

          {!abierto && sinLeer > 0 && <span style={badgeStyle}>{sinLeer}</span>}
        </button>
      </div>
    </>
  );
};

export default ChatbotFlotante;
