'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Trash2 } from 'lucide-react'
import { Drawer } from '@/components/admin/Drawer'
import { SpecialtyForm } from '@/components/admin/SpecialtyForm'

type Specialty = {
  id: number
  name: string
  description: string | null
  color: string
  isActive: boolean
}

interface SpecialtiesListProps {
  specialties: Specialty[]
  role: 'ADMIN' | 'RECEPTIONIST'
}

export function SpecialtiesList({ specialties, role }: SpecialtiesListProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Specialty | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function openCreate() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(s: Specialty) {
    setEditing(s)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
  }

  async function handleDelete(id: number) {
    await fetch('/api/admin/specialties/' + id, { method: 'DELETE' })
    router.refresh()
    setDeletingId(null)
  }

  return (
    <div>
      {role === 'ADMIN' && (
        <div className="flex justify-end mb-6">
          <button
            onClick={openCreate}
            className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white hover:shadow-[0_0_12px_rgba(20,184,166,0.4)] transition-all duration-150"
          >
            Crear especialidad
          </button>
        </div>
      )}

      {specialties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-primary font-semibold mb-2">Sin especialidades</p>
          <p className="text-text-secondary text-sm mb-6">
            Aún no hay especialidades registradas. Creá la primera para empezar.
          </p>
          {role === 'ADMIN' && (
            <button
              onClick={openCreate}
              className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white hover:shadow-[0_0_12px_rgba(20,184,166,0.4)] transition-all duration-150"
            >
              Crear especialidad
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-xl shadow-card">
          {specialties.map((specialty) => (
            <div
              key={specialty.id}
              className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-b-0"
            >
              <div
                className="h-5 w-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: specialty.color }}
              />
              <span className="text-sm font-semibold text-text-primary flex-1">
                {specialty.name}
              </span>
              <span className="text-sm text-text-secondary flex-1 truncate">
                {specialty.description ?? ''}
              </span>
              {role === 'ADMIN' && (
                <div className="flex items-center gap-1">
                  {deletingId === specialty.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">¿Confirmar eliminación?</span>
                      <button
                        className="text-sm font-semibold text-error"
                        onClick={() => handleDelete(specialty.id)}
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
                        aria-label="Editar especialidad"
                        onClick={() => openEdit(specialty)}
                        className="text-text-secondary hover:text-text-primary transition-colors p-1"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Eliminar especialidad"
                        onClick={() => setDeletingId(specialty.id)}
                        className="text-error hover:text-error transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Editar especialidad' : 'Crear especialidad'}
      >
        <SpecialtyForm specialty={editing} onClose={closeDrawer} />
      </Drawer>
    </div>
  )
}
