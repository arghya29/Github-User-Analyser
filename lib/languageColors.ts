export const languageColors: { [key: string]: string } = {
  JavaScript: '#eab308',
  TypeScript: '#2563eb',
  Python: '#60a5fa',
  Java: '#dc2626',
  Go: '#06b6d4',
  Rust: '#c2410c',
  'C++': '#1e40af',
  C: '#4b5563',
  CSS: '#ec4899',
  HTML: '#ef4444',
  Shell: '#374151',
  Ruby: '#b91c1c',
}

export const fallbackLanguageColor = '#94a3b8'

export function getLanguageColor(language: string | null | undefined): string {
  if (!language) return fallbackLanguageColor
  return languageColors[language] || fallbackLanguageColor
}

// Tailwind class version, for places that need a class instead of a hex value
export const languageColorClasses: { [key: string]: string } = {
  JavaScript: 'bg-yellow-500',
  TypeScript: 'bg-blue-600',
  Python: 'bg-blue-400',
  Java: 'bg-red-600',
  Go: 'bg-cyan-500',
  Rust: 'bg-orange-700',
  'C++': 'bg-blue-800',
  C: 'bg-gray-600',
  CSS: 'bg-pink-500',
  HTML: 'bg-red-500',
  Shell: 'bg-gray-700',
  Ruby: 'bg-red-700',
}

export function getLanguageColorClass(language: string | null | undefined): string {
  if (!language) return 'bg-gray-400'
  return languageColorClasses[language] || 'bg-gray-500'
}