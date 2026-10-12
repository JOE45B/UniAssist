import axios, { AxiosError } from 'axios'

export const TOKEN_KEY = 'uniassist_token'

/** The single Axios instance used by every request in the app. */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // An expired or revoked session: drop the token and let the app send the user to sign in.
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('uniassist:unauthorized'))
    }
    return Promise.reject(error)
  },
)

/** Turns any thrown value into a message that is safe to show to the user. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
    if (!error.response) return 'Cannot reach the UniAssist server. Check that the API is running and try again.'
    return `Request failed (${error.response.status})`
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

/** Removes empty values so they are not sent as blank query parameters. */
export function cleanParams(params: Record<string, string | number | boolean | undefined | null>) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))
}

export default api
