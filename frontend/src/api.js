import axios from 'axios'

export const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
export const WS = API.replace(/^http/, 'ws')

const KEY = 'casefile.token'
// Storage can be blocked (private windows, strict settings), so every access is guarded.
export const tokenStore = {
  get() { try { return localStorage.getItem(KEY) } catch { return null } },
  set(t) { try { localStorage.setItem(KEY, t) } catch { /* the login then lasts until the tab closes */ } },
  clear() { try { localStorage.removeItem(KEY) } catch { /* nothing to clear */ } },
}
let memoryToken = null // fallback so login still works when storage is blocked
export const getToken = () => tokenStore.get() ?? memoryToken
export const setToken = (t) => { memoryToken = t; tokenStore.set(t) }
export const clearToken = () => { memoryToken = null; tokenStore.clear() }

// Suspect answers can take a while when a local AI model is voicing them.
export const http = axios.create({ baseURL: API, timeout: 60_000 })

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !String(err.config?.url).startsWith('/auth/login')) {
      clearToken()
      window.dispatchEvent(new Event('casefile:logout'))
    }
    return Promise.reject(err)
  },
)

/** A sentence a person can act on, from any request failure. */
export function errorText(err) {
  if (!err.response) {
    return err.code === 'ECONNABORTED'
      ? 'The server took too long to answer. Try again.'
      : `Can't reach the server at ${API}. Is the backend running?`
  }
  const detail = err.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) {
    const field = detail[0].loc?.at(-1)
    return `${field ? `${field}: ` : ''}${detail[0].msg}`
  }
  return `Something went wrong (error ${err.response.status}).`
}
