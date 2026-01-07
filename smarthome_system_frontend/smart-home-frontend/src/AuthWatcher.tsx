import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLocation } from 'react-router-dom'

export default function AuthWatcher() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const navigate = useNavigate()
  const location = useLocation()
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }

    if (!isAuthenticated && location.pathname !== '/auth') {
        navigate('/auth', { replace: true })
    }
  }, [isAuthenticated])

  return null
}
