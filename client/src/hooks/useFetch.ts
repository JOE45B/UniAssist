import { useCallback, useEffect, useState } from 'react'
import api, { getErrorMessage } from '../services/api'

export interface FetchState<T> {
  data: T | null
  /** True while a request is in flight (including background refreshes). */
  loading: boolean
  error: string | null
  /** Re-runs the request (used by Retry buttons and after mutations). */
  reload: () => void
}

interface Result<T> { data: T | null; error: string | null; doneKey: string | null }

/**
 * Loads data from the API with loading / error / retry handling.
 * `params` are sent as the query string; the request re-runs whenever they change.
 * Previous data stays available during a refresh so lists do not flicker.
 * Pass `url = null` to skip the request.
 */
export function useFetch<T>(url: string | null, params?: Record<string, unknown>): FetchState<T> {
  const [result, setResult] = useState<Result<T>>({ data: null, error: null, doneKey: null })
  const [tick, setTick] = useState(0)
  const paramKey = JSON.stringify(params ?? {})
  const requestKey = `${url}|${paramKey}|${tick}`

  useEffect(() => {
    if (!url) return
    const controller = new AbortController()
    api.get<T>(url, { params: JSON.parse(paramKey), signal: controller.signal })
      .then((res) => setResult({ data: res.data, error: null, doneKey: requestKey }))
      .catch((err) => {
        if (controller.signal.aborted) return
        setResult((prev) => ({ data: prev.data, error: getErrorMessage(err), doneKey: requestKey }))
      })
    return () => controller.abort()
  }, [url, paramKey, requestKey])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const loading = Boolean(url) && result.doneKey !== requestKey
  return { data: url ? result.data : null, loading, error: loading ? null : result.error, reload }
}
