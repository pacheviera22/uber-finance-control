---
trigger: always_on
---

---
name: rentabilidad-uber
description: Analiza la rentabilidad neta real de viajes de Uber para una Toyota Highlander 2025 (24 MPG).
---

# Skill de Análisis de Rentabilidad (Uber XL/Comfort)

Este skill permite calcular cuánto dinero queda realmente después de gastos, optimizado para el motor 2.4L Turbo de la Highlander 2025.

## Contexto del Vehículo
- **Rendimiento:** 24 MPG (promedio).
- **Costo de Desgaste:** $0.15 por milla (incluye depreciación de auto nuevo y mantenimiento preventivo de motor turbo).

## Instrucciones para el Agente
Cuando el usuario mencione sus ingresos de Uber y las millas recorridas, debes ejecutar los siguientes pasos:

1. **Obtener el precio de la gasolina:** Si el usuario no lo menciona, asume un promedio de $3.00/galón o pregunta el precio actual en Naples.
2. **Calcular Gastos:**
   - **Combustible:** (Millas totales / 24) * Precio del galón.
   - **Desgaste:** Millas totales * 0.15.
3. **Calcular Ganancia Neta:** Ingresos brutos - (Combustible + Desgaste).
4. **Formatear Respuesta:**
   - Presenta un resumen claro con emojis.
   - Muestra el "Margen Real" (Ganancia Neta / Ingresos Brutos).
   - Indica el costo operativo por milla.

## Ejemplo de Salida Esperada
"De tus **$200** brutos, tu ganancia real es **$162.40**. Gastaste $15.10 en gasolina y reservamos $22.50 para el mantenimiento futuro de tu Highlander."