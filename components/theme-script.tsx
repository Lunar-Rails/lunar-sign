interface ThemeScriptProps {
  storageKey: string
  defaultTheme: 'light' | 'dark'
}

export function ThemeScript({ storageKey, defaultTheme }: ThemeScriptProps) {
  // Rendered from a Server Component, so React never reconciles this <script>
  // on the client and the "Encountered a script tag" warning is avoided.
  const code = `(function(){try{var t=localStorage.getItem(${JSON.stringify(storageKey)})||${JSON.stringify(defaultTheme)};var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
