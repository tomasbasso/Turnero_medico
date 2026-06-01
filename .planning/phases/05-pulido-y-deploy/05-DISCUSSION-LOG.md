# Phase 5: Pulido y Deploy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 5-pulido-y-deploy
**Areas discussed:** Rate limiting backend, Supabase prod, Deploy strategy

---

## Selección de áreas grises

Al usuario se le ofrecieron 4 áreas (Dark mode, Rate limiting, WCAG AA, Deploy). Respondió: *"Quiero que hagas y revises lo necesario para que el sistema funcione, si hay algo concreto que deba responderte preguntame"* — delegó las decisiones de implementación a Claude y pidió que solo se le pregunte lo concretamente suyo.

**Resolución:** Claude tomó las decisiones de dark mode (D-01..D-05) y WCAG AA (D-06..D-07) como builder. Se elevaron a pregunta solo las decisiones de infra/cuentas externas (rate limiting backend, Supabase prod, deploy).

---

## Rate limiting — backend

| Option | Description | Selected |
|--------|-------------|----------|
| Upstash Redis | Free tier, persistente, estándar en Vercel. Requiere cuenta + 2 env vars. | ✓ |
| In-memory simple | Sin cuentas; se resetea por instancia serverless. | |

**User's choice:** Upstash Redis
**Notes:** Como el deploy se difiere y el usuario quiere correr en local YA, Claude agregó la decisión D-09: fallback in-memory automático cuando faltan las env vars de Upstash. Así corre en local sin cuenta y queda production-ready.

---

## Supabase producción

| Option | Description | Selected |
|--------|-------------|----------|
| Usar la Supabase actual | El proyecto de dev pasa a ser prod. | ✓ |
| Proyecto separado para prod | Segundo proyecto Supabase aislado. | |

**User's choice:** Usar la Supabase actual
**Notes:** Relevante solo al momento del deploy (diferido).

---

## Deploy a Vercel

| Option | Description | Selected |
|--------|-------------|----------|
| Preparás todo, yo conecto | Claude deja el código listo; usuario conecta repo y pega secrets. | |
| Guíame paso a paso | Claude guía cada paso del dashboard. | |

**User's choice:** Free-text — *"Toda la parte de subirla a la web la hacemos luego, ahora quiero que quede funcionando en local, ok?"*
**Notes:** Deploy DIFERIDO. El scope inmediato de la Fase 5 se reduce a las 3 piezas locales (dark mode, WCAG AA, rate limiting). El código queda production-ready pero no se sube todavía.

---

## Claude's Discretion

- Mecanismo dark mode (clase `.dark`, script anti-FOUC, persistencia localStorage) — D-01..D-05.
- Profundidad WCAG AA (contraste + focus + aria + teclado + alt) — D-06..D-07.
- Estructura del provider/hook de tema, ubicación del toggle, implementación interna del limiter.

## Deferred Ideas

- Deploy a Vercel + Supabase prod (reutilizando proyecto actual) — sesión posterior.
- Email de confirmación, audit log, notificaciones en tiempo real, gestión de pacientes — fuera de scope.
