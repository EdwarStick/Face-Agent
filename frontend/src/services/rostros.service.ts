import api from '../api/axios';

export interface RostrosCountResponse {
  total: number;
}

export const rostrosService = {
  getCount: async (): Promise<RostrosCountResponse> => {
    const { data } = await api.get<RostrosCountResponse>('/rostros/count');
    return data;
  },
};
