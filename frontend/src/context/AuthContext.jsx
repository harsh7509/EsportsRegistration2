import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI, setTokens, clearTokens, getToken } from '../services/api';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        isAuthenticated: true,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
        isAuthenticated: false,
        user: null
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Helper: call /auth/me using whatever shape authAPI exposes
async function fetchMeSafe(/* token not required once axios has header */) {
  try {
    if (authAPI?.me) {
      const r = await authAPI.me();
      return r?.data?.user ?? r?.data ?? null;
    }
    if (authAPI?.get) {
      const r = await authAPI.get('/auth/me');
      return r?.data?.user ?? r?.data ?? null;
    }
    // Fallback to fetch if needed
    const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    const r = await fetch(`${API}/auth/me`, {
      headers: {},
      credentials: 'include',
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.user ?? data ?? null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount: restore session from token + (user OR /auth/me)
  useEffect(() => {
    (async () => {
      try {
        const token = getToken(); // from your services/api storage
        if (token) {
       // set Authorization immediately for all api calls
       // (doesn't require refresh token)
       // we don't want to call setTokens() without refresh, just set header:
       import('../services/api').then(({ api }) => {
         api.defaults.headers.common.Authorization = `Bearer ${token}`;
       });
     }
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          // Fast path: we already have a user cached
          const user = JSON.parse(storedUser);
          console.log('🔑 Restoring user session:', user.email);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
        } else if (token && !storedUser) {
          // Token present but user missing → fetch /auth/me
          const meUser = await fetchMeSafe();
          if (meUser) {
            localStorage.setItem('user', JSON.stringify(meUser));
            dispatch({ type: 'LOGIN_SUCCESS', payload: { user: meUser } });
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('❌ Error restoring session:', error);
        clearTokens();
        localStorage.removeItem('user');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
  }, []);

  /**
   * 🔧 NEW: Adopt freshly issued tokens (e.g., after OTP verify),
   * fetch /auth/me, persist user, and update context in one shot.
   */
  const adoptTokensAndLoadUser = async (accessToken, refreshToken) => {
    // Set tokens first so axios attaches Authorization
    if (accessToken || refreshToken) {
      setTokens(accessToken || '', refreshToken || '');
    }
    const user = await fetchMeSafe();
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
    } else {
      // If /me fails, clear the bad tokens
      clearTokens();
      localStorage.removeItem('user');
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Failed to load user' });
    }
    return user;
  };

const login = async ({ email, password }) => {
  dispatch({ type: 'LOGIN_START' });
  try {
    const res = await authAPI.login({ email, password });
    const { accessToken, refreshToken, user: u } = res.data || {};

    if (!accessToken || !u) {
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Invalid server response' });
      return { success: false, error: 'Invalid server response' };
    }

    // make subsequent calls authorized
    setTokens(accessToken, refreshToken);

    // store user now so UI can redirect without fetching /auth/me
    localStorage.setItem('user', JSON.stringify(u));

    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: u } });
    return { success: true, user: u };
  } catch (e) {
    const errMsg = e?.response?.data?.message || 'Login failed';
    dispatch({ type: 'LOGIN_FAILURE', payload: errMsg });
    return { success: false, error: errMsg };
  }
};


  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      console.log('📝 Attempting registration with:', userData.email);

      const resp = await authAPI.register(userData);
      const data = resp?.data ?? resp ?? {};

      // If staged signup → go to OTP step on the Signup page.
      if (data?.otpRequired) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return { success: true, otpRequired: true, tempToken: data.tempToken };
      }

      const accessToken =
        data.accessToken || data.access_token || data.token || null;
      const refreshToken =
        data.refreshToken || data.refresh_token || null;

      if (accessToken || refreshToken) {
        setTokens(accessToken || '', refreshToken || '');
      }

      let user = data.user ?? null;
      if (!user && accessToken) {
        user = await fetchMeSafe();
      }

      if (user) localStorage.setItem('user', JSON.stringify(user));

      dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
      return { success: true, user };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Registration failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      return { success: false, error: message };
    }
  };

  const logout = () => {
    console.log('🚪 Logging out user');
    clearTokens();
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (profileData) => {
    try {
      console.log('📝 Updating profile:', profileData);
      const response = await authAPI.updateProfile(profileData);
      const updatedUser = response?.data?.user ?? response?.data ?? null;

      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: updatedUser } });
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Profile update error:', error);
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || 'Update failed'
      };
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    adoptTokensAndLoadUser, // 👈 expose for OTP verify flow
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
