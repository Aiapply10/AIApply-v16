import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user, token) => set({ user, token, isAuthenticated: !!user }),
      
      logout: async () => {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (e) {
          console.error('Logout error:', e);
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${get().token}`,
            },
          });
          if (response.ok) {
            const user = await response.json();
            set({ user, isAuthenticated: true, isLoading: false });
            return true;
          }
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return false;
        } catch (e) {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export const useResumeStore = create((set) => ({
  resumes: [],
  currentResume: null,
  isLoading: false,

  setResumes: (resumes) => set({ resumes }),
  setCurrentResume: (resume) => set({ currentResume: resume }),
  setLoading: (isLoading) => set({ isLoading }),
}));

export const useApplicationStore = create((set) => ({
  applications: [],
  isLoading: false,

  setApplications: (applications) => set({ applications }),
  setLoading: (isLoading) => set({ isLoading }),
}));
