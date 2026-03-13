import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
});

export const authenticate = async (username: string, email: string) => {
  // Simple mock auth for this project requirements
  try {
    const res = await api.post('/auth/register', { username, email, password: 'password' });
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 400) {
      // already exists, let's just pretend we logged in (this is a simple demo app)
      return { id: 1, username, email }; 
    }
    throw err;
  }
};

export const uploadResume = async (userId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/resumes/upload?user_id=${userId}`, formData);
  return res.data;
};

export const fetchResumes = async (userId: number, q: string = '') => {
  const url = `/resumes?user_id=${userId}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  const res = await api.get(url);
  return res.data;
};

export const generateResume = async (baseContextId: number, jd: string, instructions: string, title: string, templateType: string = 'standard') => {
  const res = await api.post(`/resumes/generate?base_context_id=${baseContextId}`, {
    job_description: jd,
    custom_instructions: instructions,
    title,
    template_type: templateType
  });
  return res.data;
};

export const downloadUrl = (id: number, format: 'pdf' | 'docx' | 'md') => {
  return `${API_URL}/resumes/${id}/download?format=${format}`;
};

export const deleteGeneratedResume = async (id: number) => {
  const res = await api.delete(`/resumes/generated/${id}`);
  return res.data;
};

export const downloadBaseUrl = (id: number) => {
  return `${API_URL}/resumes/base/${id}/download`;
};
