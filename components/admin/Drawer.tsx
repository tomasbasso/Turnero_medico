'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import FocusTrap from 'focus-trap-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              allowOutsideClick: true,
              escapeDeactivates: false,
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-surface rounded-l-xl shadow-modal z-50 flex flex-col"
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-accent rounded-tl-xl" />
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-display text-xl font-semibold text-text-primary pl-2">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Cerrar panel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {children}
              </div>
            </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  )
}
