import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearToken, getToken, http, setToken } from './api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) return
    http.get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('casefile:logout', onLogout)
    return () => window.removeEventListener('casefile:logout', onLogout)
  }, [])

  const signIn = useCallback(async (username, password) => {
    const { data } = await http.post('/auth/login', new URLSearchParams({ username, password }))
    setToken(data.access_token)
    setUser((await http.get('/auth/me')).data)
  }, [])

  const signUp = useCallback(async (username, password) => {
    await http.post('/auth/register', { username, password })
    await signIn(username, password)
  }, [signIn])

  const signOut = useCallback(() => { clearToken(); setUser(null) }, [])

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut }), [user, loading, signIn, signUp, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
