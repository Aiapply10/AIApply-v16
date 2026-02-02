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
      lastAuthCheck: null,

      setUser: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: !!user,
        lastAuthCheck: Date.now()
      }),
      
      // Update user data without changing token
      updateUser: (user) => set({ user, isAuthenticated: !!user }),
      
      logout: async () => {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (e) {
          console.error('Logout error:', e);
        }
        set({ user: null, token: null, isAuthenticated: false, lastAuthCheck: null });
      },

      checkAuth: async () => {
        const state = get();
        
        // If we have a token and checked recently (within 5 minutes), skip the check
        if (state.token && state.lastAuthCheck && (Date.now() - state.lastAuthCheck < 5 * 60 * 1000)) {
          if (state.user) {
            return true;
          }
        }
        
        // No token means not authenticated
        if (!state.token) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return false;
        }
        
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${state.token}`,
            },
          });
          if (response.ok) {
            const user = await response.json();
            set({ user, isAuthenticated: true, isLoading: false, lastAuthCheck: Date.now() });
            return true;
          }
          // Token is invalid, clear it
          set({ user: null, token: null, isAuthenticated: false, isLoading: false, lastAuthCheck: null });
          return false;
        } catch (e) {
          console.error('Auth check error:', e);
          // Don't clear token on network errors, just mark as not loading
          set({ isLoading: false });
          return state.isAuthenticated;
        }
      },
    }),
    {
      name: 'auth-storage',
      // Persist both token AND user data for faster page loads
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastAuthCheck: state.lastAuthCheck
      }),
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
