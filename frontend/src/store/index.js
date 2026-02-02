import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Track if store has been hydrated from localStorage
let hasHydrated = false;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      lastAuthCheck: null,
      _hasHydrated: false,

      setHasHydrated: (state) => {
        hasHydrated = state;
        set({ _hasHydrated: state });
      },

      setUser: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: !!user,
        lastAuthCheck: Date.now()
      }),
      
      // Update user data without changing token
      updateUser: (user) => set({ user, isAuthenticated: !!user }),
      
      logout: async () => {
        const state = get();
        try {
          if (state.token) {
            await fetch(`${API_URL}/auth/logout`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${state.token}`,
              },
            });
          }
        } catch (e) {
          console.error('Logout error:', e);
        }
        set({ user: null, token: null, isAuthenticated: false, lastAuthCheck: null });
      },

      // Force clear auth state (used by 401 interceptor)
      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false, lastAuthCheck: null });
      },

      checkAuth: async () => {
        const state = get();
        
        // Wait for hydration if not yet hydrated
        if (!hasHydrated) {
          // Small delay to allow hydration to complete
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Re-get state after potential hydration
        const currentState = get();
        
        // If we have a token and user, and checked recently (within 10 minutes), skip the API check
        if (currentState.token && currentState.user && currentState.lastAuthCheck) {
          const timeSinceLastCheck = Date.now() - currentState.lastAuthCheck;
          if (timeSinceLastCheck < 10 * 60 * 1000) {
            return true;
          }
        }
        
        // No token means not authenticated
        if (!currentState.token) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return false;
        }
        
        // If we have token and user but no recent check, return true optimistically
        // The API will catch any invalid tokens via 401 interceptor
        if (currentState.token && currentState.user) {
          set({ lastAuthCheck: Date.now() });
          return true;
        }
        
        // Only make API call if we have token but no user data
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${currentState.token}`,
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
          // On network errors, trust existing state
          set({ isLoading: false });
          return currentState.isAuthenticated;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist both token AND user data for faster page loads
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastAuthCheck: state.lastAuthCheck
      }),
      onRehydrateStorage: () => (state) => {
        hasHydrated = true;
        state?.setHasHydrated(true);
      },
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
