'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit, Trash2 } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { Drawer } from '@/components/admin/Drawer'
import { DoctorForm } from '@/components/admin/DoctorForm'

type Doctor = {
  id: number
  name: string
  specialtyId: number
  avatar: string | null
  bio: string | null
  phone: string | null
  durationMin: number
  specialty: { id: number; name: string; color: string }
}

type Specialty = { id: number; name: string; color: string }

interface DoctorsListProps {
  doctors: Doctor[]
  specialties: Specialty[]
  role: 'ADMIN' | 'RECEPTIONIST'
}

export function DoctorsList({ doctors, specialties, role }: DoctorsListProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function openCreate() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(d: Doctor) {
    setEditing(d)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
  }

  async function handleDelete(id: number) {
    await fetch('/api/admin/doctors/' + id, { method: 'DELETE' })
    router.refresh()
    setDeletingId(null)
  }

  return (
    <div>
      {role === 'ADMIN' && (
        <div className="flex justify-end mb-6">
          <button
            onClick={openCreate}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150"
          >
            Crear médico
          </button>
        </div>
      )}

      {doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-primary font-semibold mb-2">Sin médicos</p>
          <p className="text-text-secondary text-sm mb-6">
            Aún no hay médicos registrados. Agregá el primero para comenzar.
          </p>
          {role === 'ADMIN' && (
            <button
              onClick={openCreate}
              className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150"
            >
              Crear médico
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-xl shadow-card">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-b-0"
            >
              {doctor.avatar ? (
                <img
                  src={doctor.avatar}
                  alt={doctor.name}
                  className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                  {getInitials(doctor.name)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-text-primary block">
                  {doctor.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: doctor.specialty.color }}
                  />
                  <span className="text-xs bg-primary-light text-primary rounded-full px-2 py-0.5">
                    {doctor.specialty.name}
                  </span>
                </div>
              </div>

              <span className="text-sm text-text-secondary hidden sm:block">
                {doctor.phone ?? '—'}
              </span>

              <span className="text-xs text-text-muted">{doctor.durationMin} min</span>

              <div className="flex items-center gap-1">
                <Link
                  href={`/admin/medicos/${doctor.id}/disponibilidad`}
                  className="text-xs font-semibold text-accent hover:text-primary transition-colors px-2 py-1"
                >
                  Disponibilidad
                </Link>
                {role === 'ADMIN' && (
                  <>
                    {deletingId === doctor.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">
                          ¿Confirmar eliminación? Esta acción no se puede deshacer.
                        </span>
                        <button
                          className="text-sm font-semibold text-error"
                          onClick={() => handleDelete(doctor.id)}
                        >
                          Sí, eliminar
                        </button>
                        <button
                          className="text-sm text-text-secondary"
                          onClick={() => setDeletingId(null)}
                        >
                          Descartar cambios
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          aria-label="Editar médico"
                          onClick={() => openEdit(doctor)}
                          className="text-text-secondary hover:text-text-primary transition-colors p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Eliminar médico"
                          onClick={() => setDeletingId(doctor.id)}
                          className="text-error hover:text-error transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Editar médico' : 'Crear médico'}
      >
        <DoctorForm doctor={editing} specialties={specialties} onClose={closeDrawer} />
      </Drawer>
    </div>
  )
}
