import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  CircularProgress,
  Tooltip,
  Chip,
  Collapse,
  Avatar,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import StorageIcon from '@mui/icons-material/Storage';
import { chatService, type ChatMessage } from '../services/chatService';

// ── Sugerencias rápidas ─────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  '¿Quién está en la oficina ahora?',
  '¿Cuál es la tasa de asistencia hoy?',
  '¿Cuántos empleados hay registrados?',
];

// ── Burbuja de mensaje individual ───────────────────────────────────────────
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 1,
        mb: 1.5,
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 28,
          height: 28,
          bgcolor: isUser ? 'primary.main' : 'secondary.main',
          flexShrink: 0,
        }}
      >
        {isUser ? (
          <PersonIcon sx={{ fontSize: 16 }} />
        ) : (
          <SmartToyIcon sx={{ fontSize: 16 }} />
        )}
      </Avatar>

      {/* Burbuja */}
      <Box sx={{ maxWidth: '78%' }}>
        <Paper
          elevation={0}
          sx={{
            px: 1.5,
            py: 1,
            bgcolor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'white' : 'text.primary',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            border: isUser ? 'none' : '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {message.content}
          </Typography>
        </Paper>

        {/* Badge de herramienta usada */}
        {message.toolUsed && (
          <Chip
            icon={<StorageIcon sx={{ fontSize: '11px !important' }} />}
            label={`BD: ${message.toolUsed}`}
            size="small"
            variant="outlined"
            sx={{
              mt: 0.5,
              height: 18,
              fontSize: '10px',
              color: 'text.disabled',
              borderColor: 'divider',
              '& .MuiChip-label': { px: 0.8 },
            }}
          />
        )}

        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: 'text.disabled',
            mt: 0.25,
            textAlign: isUser ? 'right' : 'left',
            fontSize: '10px',
          }}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
    </Box>
  );
};

// ── Componente principal del Chatbot flotante ───────────────────────────────
export const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '¡Hola! Soy HR-Agent 🤖\n\nPuedo consultar datos reales del sistema: asistencias, empleados, estadísticas y más. ¡Pregúntame en lenguaje natural!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus en input al abrir
  useEffect(() => {
    if (open) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const response = await chatService.sendMessage(trimmed);

        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: response.respuesta,
          timestamp: new Date(),
          toolUsed: response.tool_utilizada?.nombre_funcion,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (!open) setHasNewMessage(true);
      } catch (err: unknown) {
        // Extraer mensaje específico del backend si está disponible
        let errorContent = '⚠️ No pude conectarme al servidor. Verifica tu conexión e intenta de nuevo.';
        if (err && typeof err === 'object' && 'response' in err) {
          const res = (err as { response?: { data?: { detail?: { message?: string; error_code?: string } | string } } }).response;
          const detail = res?.data?.detail;
          if (detail && typeof detail === 'object' && detail.message) {
            errorContent = `ℹ️ ${detail.message}`;
          } else if (typeof detail === 'string') {
            errorContent = `⚠️ ${detail}`;
          }
        }
        const errorMsg: ChatMessage = {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        console.error('Chat error:', err);
      } finally {
        setLoading(false);
      }
    },
    [loading, open]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Panel del chat ─────────────────────────────────────────────────── */}
      <Collapse
        in={open}
        sx={{
          position: 'fixed',
          bottom: 88,
          right: 24,
          zIndex: 1300,
          transformOrigin: 'bottom right',
        }}
      >
        <Paper
          elevation={8}
          sx={{
            width: 360,
            height: 520,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <SmartToyIcon sx={{ color: 'white', fontSize: 22 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
                HR-Agent
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                Consultas de asistencia con IA
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Mensajes */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: '#fafafa',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
            }}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Indicador de carga */}
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main' }}>
                  <SmartToyIcon sx={{ fontSize: 16 }} />
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: 'grey.100',
                    borderRadius: '16px 16px 16px 4px',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CircularProgress size={12} thickness={5} />
                  <Typography variant="caption" color="text.secondary">
                    Consultando datos…
                  </Typography>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Sugerencias rápidas (solo si hay pocos mensajes) */}
          {messages.length <= 2 && !loading && (
            <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {QUICK_SUGGESTIONS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => sendMessage(s)}
                  sx={{
                    fontSize: '11px',
                    height: 24,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'primary.light' },
                  }}
                />
              ))}
            </Box>
          )}

          {/* Input */}
          <Box
            sx={{
              p: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'white',
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end',
            }}
          >
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={3}
              size="small"
              placeholder="Pregunta algo sobre asistencias…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  fontSize: '0.85rem',
                },
              }}
            />
            <IconButton
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                width: 36,
                height: 36,
                flexShrink: 0,
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
              }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Paper>
      </Collapse>

      {/* ── Botón flotante ─────────────────────────────────────────────────── */}
      <Tooltip title={open ? 'Cerrar chat' : 'Abrir HR-Agent'} placement="left">
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
          }}
        >
          <IconButton
            id="chatbot-toggle-btn"
            onClick={() => setOpen((prev) => !prev)}
            sx={{
              width: 56,
              height: 56,
              background: open
                ? 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)'
                : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(37,99,235,0.45)',
              transition: 'all 0.25s ease',
              '&:hover': {
                transform: 'scale(1.08)',
                boxShadow: '0 6px 24px rgba(37,99,235,0.55)',
              },
            }}
          >
            {open ? <CloseIcon /> : <SmartToyIcon />}

            {/* Punto de notificación */}
            {hasNewMessage && !open && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 12,
                  height: 12,
                  bgcolor: '#ef4444',
                  borderRadius: '50%',
                  border: '2px solid white',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                    '50%': { transform: 'scale(1.3)', opacity: 0.7 },
                  },
                }}
              />
            )}
          </IconButton>
        </Box>
      </Tooltip>
    </>
  );
};

export default ChatBot;
