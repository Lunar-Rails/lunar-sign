import { SignerAppHeader } from './SignerAppHeader'
import { SignerFooter } from './SignerFooter'
import { cn } from '@/lib/utils'

interface SignerShellProps {
  children: React.ReactNode
  width?: 'narrow' | 'wide'
  align?: 'center' | 'top'
  headerSubtitle?: string
  headerActions?: React.ReactNode
}

export function SignerShell({
  children,
  width = 'narrow',
  align = 'center',
  headerSubtitle,
  headerActions,
}: SignerShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-lr-bg">
      <SignerAppHeader subtitle={headerSubtitle} actions={headerActions} />

      <main
        className={cn(
          'flex flex-1 flex-col px-4',
          align === 'center' ? 'items-center justify-center py-10' : 'items-center py-8',
          width === 'narrow' ? 'max-w-lg w-full mx-auto' : 'w-full'
        )}
      >
        {children}
      </main>

      <SignerFooter />
    </div>
  )
}
