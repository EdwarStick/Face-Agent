import api from '../../../api/axios';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolUsed?: string;
}

export interface ChatApiResponse {
  pregunta: string;
  respuesta: string;
  tool_utilizada?: {
    nombre_funcion: string;
    argumentos: Record<string, unknown>;
  };
  fuente: string;
}

export const chatService = {
  async sendMessage(pregunta: string): Promise<ChatApiResponse> {
    const response = await api.post<ChatApiResponse>('/chat/', { pregunta });
    return response.data;
  },
};
