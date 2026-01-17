import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  resolvedTheme: "light",
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Kiểm tra localStorage có khả dụng không (SSR safe)
    if (typeof window === "undefined") return defaultTheme
    
    try {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme
    } catch {
      // Trường hợp localStorage bị disable (private browsing)
      return defaultTheme
    }
  })

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light")

  useEffect(() => {
    const root = window.document.documentElement
    
    // Function để get system theme
    const getSystemTheme = (): "dark" | "light" => {
      if (typeof window === "undefined") return "light"
      
      // Kiểm tra browser có hỗ trợ matchMedia không
      if (!window.matchMedia) return "light"
      
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    }

    // Xác định theme cuối cùng
    const effectiveTheme = theme === "system" ? getSystemTheme() : theme

    // Update DOM
    root.classList.remove("light", "dark")
    root.classList.add(effectiveTheme)
    
    // Update resolved theme state
    setResolvedTheme(effectiveTheme)

    // Chỉ lắng nghe system theme khi mode là "system"
    if (theme === "system") {
      // Kiểm tra browser support
      if (!window.matchMedia) return

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      
      // Handler cho sự thay đổi
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        const newTheme = e.matches ? "dark" : "light"
        root.classList.remove("light", "dark")
        root.classList.add(newTheme)
        setResolvedTheme(newTheme)
      }

      // Hỗ trợ cả API cũ và mới
      try {
        // Modern browsers
        mediaQuery.addEventListener("change", handleChange)
      } catch {
        // Safari cũ, iOS cũ
        try {
          mediaQuery.addListener(handleChange)
        } catch (err) {
          console.warn("Theme listener not supported:", err)
        }
      }

      // Cleanup
      return () => {
        try {
          mediaQuery.removeEventListener("change", handleChange)
        } catch {
          try {
            mediaQuery.removeListener(handleChange)
          } catch (err) {
            console.warn("Theme listener cleanup failed:", err)
          }
        }
      }
    }
  }, [theme])

  const value = {
    theme,
    resolvedTheme,
    setTheme: (newTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch (err) {
        console.warn("Failed to save theme to localStorage:", err)
      }
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

// Demo Component với device detection
function ThemeDemo() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [deviceInfo, setDeviceInfo] = useState({
    browser: "Unknown",
    os: "Unknown",
    supportsMatchMedia: false,
    supportsLocalStorage: false,
  })

  useEffect(() => {
    const ua = navigator.userAgent
    let browser = "Unknown"
    let os = "Unknown"

    // Detect browser
    if (ua.includes("Chrome")) browser = "Chrome"
    else if (ua.includes("Safari")) browser = "Safari"
    else if (ua.includes("Firefox")) browser = "Firefox"
    else if (ua.includes("Edge")) browser = "Edge"

    // Detect OS
    if (ua.includes("Win")) os = "Windows"
    else if (ua.includes("Mac")) os = "macOS"
    else if (ua.includes("Linux")) os = "Linux"
    else if (ua.includes("Android")) os = "Android"
    else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS"

    // Check features
    const supportsMatchMedia = typeof window.matchMedia !== "undefined"
    let supportsLocalStorage = false
    
    try {
      localStorage.setItem("test", "test")
      localStorage.removeItem("test")
      supportsLocalStorage = true
    } catch {}

    setDeviceInfo({ browser, os, supportsMatchMedia, supportsLocalStorage })
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-2xl mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            🎨 Theme Switcher
          </h1>
          
          {/* Theme Info */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Selected: <strong className="text-blue-600 dark:text-blue-400">{theme}</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Active: <strong className="text-green-600 dark:text-green-400">{resolvedTheme}</strong>
            </p>
          </div>

          {/* Theme Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
            <button
              onClick={() => setTheme("light")}
              className={`px-4 py-3 rounded-md transition-all ${
                theme === "light"
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              ☀️ Light
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`px-4 py-3 rounded-md transition-all ${
                theme === "dark"
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              🌙 Dark
            </button>

            <button
              onClick={() => setTheme("system")}
              className={`px-4 py-3 rounded-md transition-all ${
                theme === "system"
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              💻 System
            </button>
          </div>

          {/* Device Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              📱 Device Information
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Browser:</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  {deviceInfo.browser}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">OS:</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  {deviceInfo.os}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">matchMedia:</span>
                <span className={`font-semibold ${
                  deviceInfo.supportsMatchMedia 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {deviceInfo.supportsMatchMedia ? "✓ Supported" : "✗ Not Supported"}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">localStorage:</span>
                <span className={`font-semibold ${
                  deviceInfo.supportsLocalStorage 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {deviceInfo.supportsLocalStorage ? "✓ Available" : "✗ Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
            <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-100">
              💡 <strong>Cross-device:</strong> Theme được lưu local và tự động sync với system preferences trên tất cả thiết bị!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// App wrapper
export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <ThemeDemo />
    </ThemeProvider>
  )
}