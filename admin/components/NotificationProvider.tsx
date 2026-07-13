'use client'
import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

export interface ConfirmConfig {
  message: string
  title?: string
  okText?: string
  cancelText?: string
  danger?: boolean
  resolve: (value: boolean) => void
}

interface ToastOptions {
  type?: ToastType
  duration?: number
}

interface ConfirmOptions {
  title?: string
  okText?: string
  cancelText?: string
  danger?: boolean
}

interface NotificationContextProps {
  showToast: (message: string, options?: ToastOptions) => void
  showConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null)

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    const type = options?.type || 'success'
    const duration = options?.duration || 3000

    setToasts(prev => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const showConfirm = useCallback((message: string, options?: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setConfirmConfig({
        message,
        title: options?.title || 'Confirm Action',
        okText: options?.okText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel',
        danger: options?.danger ?? true,
        resolve: (val: boolean) => {
          resolve(val)
          setConfirmConfig(null)
        }
      })
    })
  }, [])

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Toast Portal/Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-lg flex items-start gap-3 border transition-all duration-300 animate-slide-in ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-950'
                : t.type === 'error'
                ? 'bg-rose-50 border-rose-100 text-rose-950'
                : 'bg-amber-50 border-amber-100 text-amber-950'
            }`}
          >
            {t.type === 'success' && (
              <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {t.type === 'error' && (
              <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {t.type === 'info' && (
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="text-xs font-normal leading-relaxed">{t.message}</div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100 transform transition-all scale-100 animate-fade-in">
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1B4332' }}>
              {confirmConfig.title}
            </h3>
            <p className="text-xs text-gray-500 font-light leading-relaxed mb-6">
              {confirmConfig.message}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => confirmConfig.resolve(false)}
                className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all cursor-pointer"
              >
                {confirmConfig.cancelText}
              </button>
              <button
                onClick={() => confirmConfig.resolve(true)}
                className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-medium transition-all text-white cursor-pointer"
                style={{
                  background: confirmConfig.danger ? '#ef4444' : '#1B4332',
                }}
              >
                {confirmConfig.okText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
