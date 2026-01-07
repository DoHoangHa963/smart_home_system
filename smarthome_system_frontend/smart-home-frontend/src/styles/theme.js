// SmartHome Theme - Flat Design với tông màu trung tính, tương phản
export const theme = {
  // Primary Colors - Màu chủ đạo
  colors: {
    primary: {
      50: '#e6f2ff',
      100: '#cce5ff',
      200: '#99cbff',
      300: '#66b0ff',
      400: '#3396ff',
      500: '#007BFF',    // Màu chính - xanh dương công nghệ
      600: '#0066cc',
      700: '#0052a3',
      800: '#003d7a',
      900: '#002952'
    },
    
    // Neutral Colors - Màu trung tính
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    },
    
    // Success/Error/Warning
    success: {
      500: '#10b981',
      600: '#059669'
    },
    error: {
      500: '#ef4444',
      600: '#dc2626'
    },
    warning: {
      500: '#f59e0b',
      600: '#d97706'
    },
    
    // Backgrounds
    background: {
      light: '#ffffff',
      dark: '#0f172a',
      card: '#f8fafc'
    },
    
    // Text
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      disabled: '#9ca3af',
      inverse: '#ffffff'
    }
  },
  
  // Typography
  typography: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  
  // Shadows (Flat Design - minimal shadows)
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px'
  },
  
  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem'
  },
  
  // Transitions
  transitions: {
    default: 'all 0.2s ease-in-out',
    fast: 'all 0.1s ease-in-out',
    slow: 'all 0.3s ease-in-out'
  }
};