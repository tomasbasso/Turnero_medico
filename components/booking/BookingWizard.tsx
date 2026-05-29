'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StepProgress } from './StepProgress'
import { StepSpecialty } from './StepSpecialty'
import { StepDoctor } from './StepDoctor'
import { StepDateTime } from './StepDateTime'
import { StepPatientForm } from './StepPatientForm'
import { StepConfirmation } from './StepConfirmation'

type SpecialtyOption = { id: number; name: string; color: string }
type DoctorOption = {
  id: number
  name: string
  bio?: string | null
  avatar?: string | null
  durationMin: number
}

export function BookingWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyOption | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [patientName, setPatientName] = useState('')
  const [patientDni, setPatientDni] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [patientInsurance, setPatientInsurance] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [confirmedAppointment, setConfirmedAppointment] = useState<{ id: number } | null>(null)

  function goTo(nextStep: 1 | 2 | 3 | 4 | 5) {
    setDirection(nextStep > step ? 1 : -1)
    setStep(nextStep)
  }

  function resetWizard() {
    setStep(1)
    setDirection(1)
    setSelectedSpecialty(null)
    setSelectedDoctor(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setPatientName('')
    setPatientDni('')
    setPatientPhone('')
    setPatientInsurance('')
    setPatientEmail('')
    setConfirmedAppointment(null)
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-16">
      <div className="relative w-full max-w-2xl">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent opacity-10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary opacity-10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-2xl bg-white/80 backdrop-blur-md rounded-2xl shadow-modal border border-accent/20 p-6">
          <StepProgress currentStep={step} />

          {step > 1 && step < 5 && (
            <button
              onClick={() => goTo((step - 1) as 1 | 2 | 3 | 4 | 5)}
              className="text-sm text-primary hover:text-accent mb-4 block"
            >
              ← Volver
            </button>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: direction === 1 ? 0.25 : 0.2, ease: 'easeOut' }}
            >
              {step === 1 && (
                <StepSpecialty
                  onSelect={(s) => {
                    setSelectedSpecialty(s)
                    goTo(2)
                  }}
                />
              )}
              {step === 2 && selectedSpecialty && (
                <StepDoctor
                  specialtyId={selectedSpecialty.id}
                  specialtyName={selectedSpecialty.name}
                  onSelect={(d) => {
                    setSelectedDoctor(d)
                    goTo(3)
                  }}
                  onBack={() => goTo(1)}
                />
              )}
              {step === 3 && selectedDoctor && (
                <StepDateTime
                  doctorId={selectedDoctor.id}
                  doctorName={selectedDoctor.name}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDaySelect={(date) => {
                    setSelectedDate(date)
                    setSelectedTime(null)
                  }}
                  onTimeSelect={(time) => setSelectedTime(time)}
                  onConfirm={() => goTo(4)}
                  onBack={() => goTo(2)}
                />
              )}
              {step === 4 && selectedDoctor && selectedDate && selectedTime && (
                <StepPatientForm
                  doctorName={selectedDoctor.name}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  patientName={patientName}
                  setPatientName={setPatientName}
                  patientDni={patientDni}
                  setPatientDni={setPatientDni}
                  patientPhone={patientPhone}
                  setPatientPhone={setPatientPhone}
                  patientInsurance={patientInsurance}
                  setPatientInsurance={setPatientInsurance}
                  patientEmail={patientEmail}
                  setPatientEmail={setPatientEmail}
                  doctorId={selectedDoctor.id}
                  onSuccess={(appt) => {
                    setConfirmedAppointment(appt)
                    goTo(5)
                  }}
                  onSlotTaken={() => goTo(3)}
                />
              )}
              {step === 5 && selectedSpecialty && selectedDoctor && selectedDate && selectedTime && (
                <StepConfirmation
                  selectedSpecialtyName={selectedSpecialty.name}
                  selectedDoctorName={selectedDoctor.name}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  patientName={patientName}
                  patientDni={patientDni}
                  patientInsurance={patientInsurance}
                  onReset={resetWizard}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
