# Protocolo de Seguridad e Integridad (SAFETY.md)

Este documento define las reglas OBLIGATORIAS que el Agente debe seguir antes de considerar una tarea como "completada" o antes de notificar al usuario.

## 🚨 Reglas de Oro (Golden Rules)

1.  **Nunca romper la compilación**: Antes de cualquier `notify_user` final, ejecuta `npm run dev` (o verifica la terminal) para asegurar que no hay errores de sintaxis.
2.  **Verificar Variables Críticas**: Si borras o refactorizas código, verifica si las variables eliminadas (ej. `weeklyGoal`, `getWeekRange`) son usadas en otros lugares.
3.  **Smoke Test Obligatorio**:
    *   Ejecuta: `npx vitest run`
    *   **Si falla**: NO notifiques al usuario. Arregla el código o el test primero.
    *   El test verifica que la aplicación carga (`render`) y muestra la pantalla de inicio ("Bienvenido").

## Checklist de Pre-Vuelo (Pre-Flight Checklist)

Antes de `notify_user`:

- [ ] ¿He borrado funciones o estados? -> Buscar referencias globales.
- [ ] ¿He cambiado lógica de inicio? -> Ejecutar `npx vitest run`.
- [ ] ¿La terminal de `npm run dev` está limpia de errores rojos?

## Recuperación de Desastres

Si el sistema reporta "Pantalla Blanca":
1.  Revertir el último cambio inmediatamente.
2.  Ejecutar el Smoke Test para confirmar la rotura.
3.  Analizar logs de `npm run dev`.
