'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type Specialty = {
  id: number
  name: string
  description: string | null
  color: string
}

interface SpecialtyFormProps {
  specialty: Specialty | null
  onClose: () => void
}

export function SpecialtyForm({ specialty, onClose }: SpecialtyFormProps) {
  const router = useRouter()
  const [name, setName] = useState(specialty?.name ?? '')
  const [description, setDescription] = useState(specialty?.description ?? '')
  const [color, setColor] = useState(specialty?.color ?? '#0d9488')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }
    setLoading(true)
    setError('')
    try {
      const url = specialty
        ? '/api/admin/specialties/' + specialty.id
        : '/api/admin/specialties'
      const res = await fetch(url, {
        method: specialty ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description || null, color }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Ocurrió un error al guardar. Intentá nuevamente.')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setError('Ocurrió un error al guardar. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[rgba(13,148,136,0.4)] focus:ring-2 focus:ring-[rgba(13,148,136,0.2)] transition-all'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs text-text-secondary mb-1">Nombre</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Descripción</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 rounded cursor-pointer border-0 p-0 bg-transparent"
          />
          <div className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-error">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-[rgba(13,148,136,0.3)] px-4 py-2 text-sm font-semibold text-primary transition-all duration-150 hover:bg-primary/5"
        >
          Descartar cambios
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:shadow-[0_0_12px_rgba(20,184,166,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : (
            'Guardar especialidad'
          )}
        </button>
      </div>
    </form>
  )
}
