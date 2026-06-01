'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { uploadAvatar } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'

type Doctor = {
  id: number
  name: string
  specialtyId: number
  bio: string | null
  phone: string | null
  durationMin: number
  avatar: string | null
}

type Specialty = { id: number; name: string; color: string }

interface DoctorFormProps {
  doctor: Doctor | null
  specialties: Specialty[]
  onClose: () => void
}

export function DoctorForm({ doctor, specialties, onClose }: DoctorFormProps) {
  const router = useRouter()
  const [name, setName] = useState(doctor?.name ?? '')
  const [specialtyId, setSpecialtyId] = useState(String(doctor?.specialtyId ?? ''))
  const [bio, setBio] = useState(doctor?.bio ?? '')
  const [phone, setPhone] = useState(doctor?.phone ?? '')
  const [durationMin, setDurationMin] = useState(String(doctor?.durationMin ?? 30))
  const [preview, setPreview] = useState<string | null>(doctor?.avatar ?? null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function compressImage(source: File): Promise<File> {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
      img.src = URL.createObjectURL(source)
    })
    const max = 300
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Error al comprimir')), 'image/jpeg', 0.8),
    )
    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (selected.size > 2 * 1024 * 1024) {
      setAvatarError('La imagen no pudo subirse. Intentá con otro archivo.')
      return
    }
    setAvatarError('')
    try {
      const compressed = await compressImage(selected)
      setPreview(URL.createObjectURL(compressed))
      setFile(compressed)
    } catch {
      setAvatarError('La imagen no pudo subirse. Intentá con otro archivo.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !specialtyId) {
      setError('Nombre y especialidad son requeridos')
      return
    }
    setLoading(true)
    setError('')
    setAvatarError('')

    try {
      if (doctor) {
        // EDIT flow
        const updateData: Record<string, unknown> = {
          name: name.trim(),
          specialtyId: Number(specialtyId),
          bio: bio || null,
          phone: phone || null,
          durationMin: Number(durationMin),
        }
        if (file) {
          try {
            const avatarUrl = await uploadAvatar(file, doctor.id)
            updateData.avatar = avatarUrl
          } catch {
            setAvatarError('La imagen no pudo subirse. Intentá con otro archivo.')
          }
        }
        const res = await fetch('/api/admin/doctors/' + doctor.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Ocurrió un error al guardar. Intentá nuevamente.')
          return
        }
        onClose()
        router.refresh()
      } else {
        // CREATE flow — two-step: POST without avatar, then upload avatar
        const res = await fetch('/api/admin/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            specialtyId: Number(specialtyId),
            bio: bio || null,
            phone: phone || null,
            durationMin: Number(durationMin),
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Ocurrió un error al guardar. Intentá nuevamente.')
          return
        }
        const { doctor: created } = await res.json()

        if (file) {
          try {
            const avatarUrl = await uploadAvatar(file, created.id)
            await fetch('/api/admin/doctors/' + created.id, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ avatar: avatarUrl }),
            })
          } catch {
            setAvatarError('La imagen no pudo subirse. Intentá con otro archivo.')
          }
        }

        onClose()
        router.refresh()
      }
    } catch {
      setError('Ocurrió un error al guardar. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'input-focus w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        {preview ? (
          <img src={preview} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-lg font-semibold text-primary">
            {getInitials(name || 'M')}
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-accent hover:text-primary transition-colors"
        >
          Subir foto
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {avatarError && <p className="text-xs text-error">{avatarError}</p>}
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Nombre completo</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Especialidad</label>
        <select
          value={specialtyId}
          onChange={(e) => setSpecialtyId(e.target.value)}
          required
          className={inputClass}
        >
          <option value="" disabled hidden>
            Seleccioná una especialidad
          </option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Teléfono</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">
          Duración del turno (minutos)
        </label>
        <input
          type="number"
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
          min="10"
          max="120"
          step="5"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Biografía</label>
        <textarea
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={1000}
          className={inputClass}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-error/10 px-4 py-2.5 text-sm text-error">{error}</p>
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
          className="btn-primary flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : (
            'Guardar médico'
          )}
        </button>
      </div>
    </form>
  )
}
