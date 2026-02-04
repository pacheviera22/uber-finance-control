# **Documento de Especificación de Requerimientos de Software (SRS)**

## **Proyecto: Uber Finance Control & Analytics (Local App)**

**Versión:** 1.0

**Fecha:** 3 de febrero de 2026

**Estado:** Borrador Inicial

### **1\. Introducción**

#### **1.1 Propósito**

El propósito de este documento es definir los requisitos funcionales y no funcionales para el desarrollo de una aplicación local de gestión financiera diseñada específicamente para conductores de la plataforma Uber. La aplicación busca optimizar la toma de decisiones durante la jornada laboral mediante el análisis de métricas en tiempo real.

#### **1.2 Alcance**

La aplicación será una herramienta de escritorio o móvil de ejecución **local** (sin dependencia inicial de la nube) que permitirá al usuario:

* Gestionar el tiempo de trabajo mediante un cronómetro interactivo.  
* Establecer metas financieras diarias.  
* Registrar viajes y lecturas de odómetro.  
* Visualizar métricas de rendimiento (ganancia/hora, ganancia/milla, etc.).

#### **1.3 Glosario**

* **Odómetro:** Instrumento que indica la distancia total recorrida por el vehículo.  
* **Métricas de Rendimiento:** Indicadores clave (KPIs) calculados a partir de los datos ingresados.  
* **Jornada Laboral:** Periodo de tiempo comprendido entre el inicio y el fin de la sesión de trabajo.

### **2\. Descripción General**

#### **2.1 Perspectiva del Producto**

La aplicación funcionará de manera independiente. Utilizará una base de datos local (SQLite o similar) para garantizar la persistencia de los datos sin necesidad de conexión a internet constante.

#### **2.2 Funciones del Producto**

1. **Configuración de Jornada:** Definición de meta económica y odómetro inicial.  
2. **Control de Tiempo:** Cronómetro con funciones de pausa y reanudación.  
3. **Registro de Actividad:** Formulario para añadir, editar o eliminar viajes.  
4. **Cálculo Predictivo:** Estimación de esfuerzo necesario para cumplir la meta en el tiempo restante.  
5. **Historial:** Consulta de registros almacenados localmente.

#### **2.3 Características del Usuario**

El usuario final es un conductor de Uber que requiere una interfaz limpia, de alto contraste (para uso en vehículo) y que permita registros rápidos entre viajes.

### **3\. Requisitos Funcionales (RF)**

#### **3.1 Gestión de Sesión**

* **RF-01: Inicio de Jornada.** El sistema debe solicitar obligatoriamente tres datos al iniciar: Meta financiera (monto), Lectura inicial del odómetro y Hora planificada de finalización.  
* **RF-02: Contador de Tiempo.** El sistema debe iniciar un cronómetro al confirmar el inicio de jornada.  
* **RF-03: Control de Estados del Tiempo.** El usuario debe poder "Pausar" el contador (tiempo no productivo) y "Reanudar" (vuelta a la actividad).

#### **3.2 Registro de Datos**

* **RF-04: Registro de Viajes.** Por cada viaje, el sistema permitirá ingresar: Monto ganado ($) y Lectura actual del odómetro.  
* **RF-05: Persistencia Local.** Todos los viajes deben guardarse automáticamente en una base de datos local.  
* **RF-06: Gestión de Historial (CRUD).** El usuario podrá visualizar una lista de los viajes del día, pudiendo editarlos o eliminarlos en caso de error.

#### **3.3 Cálculos y Métricas (Motor de Análisis)**

El sistema debe calcular automáticamente y mostrar en pantalla:

* **RF-07: Ganancia Total:** Sumatoria de los montos de todos los viajes registrados.  
* **RF-08: Millas Recorridas:** (Odómetro Actual del último viaje \- Odómetro Inicial del día).  
* **RF-09: Ganancia por Hora:** (Ganancia Total / Tiempo transcurrido en el cronómetro activo).  
* **RF-10: Ganancia por Milla:** (Ganancia Total / Millas Recorridas).  
* **RF-11: Meta Restante:** (Meta Definida \- Ganancia Total).  
* **RF-12: Tiempo Restante de Trabajo:** (Hora de fin planificada \- Hora actual).  
* **RF-13: Ganancia por Hora Necesaria:** (Meta Restante / Tiempo Restante de Trabajo).

### **4\. Requisitos No Funcionales (RNF)**

#### **4.1 Usabilidad**

* **Interfaz Moderna:** Uso de diseño minimalista con botones grandes para facilitar la interacción táctil.  
* **Modo Oscuro/Claro:** Adaptabilidad según la iluminación del entorno del conductor.

#### **4.2 Rendimiento**

* **Cálculo Instantáneo:** Las métricas deben actualizarse en menos de 500ms tras el registro de un nuevo viaje.

#### **4.3 Seguridad y Privacidad**

* **Almacenamiento Local:** Los datos financieros no deben salir del dispositivo del usuario a menos que este lo exporte manualmente.

### **5\. Interfaz de Usuario (Propuesta)**

**Secciones Principales:**

1. **Header:** Meta Diaria vs Ganancia Actual (Barra de progreso).  
2. **Centro:** Cronómetro grande con botones "Pausar/Reanudar" y el indicador "Ganancia/Hora necesaria".  
3. **Footer:** Botón flotante (+) para "Registrar Viaje" y tabla rápida de los últimos 3 registros.

### **6\. Matriz de Trazabilidad Sugerida**

| ID Requisito | Descripción | Prioridad |
| :---- | :---- | :---- |
| RF-01 | Configuración Meta/Odo | Alta |
| RF-02 | Cronómetro de Jornada | Alta |
| RF-13 | Cálculo de Ganancia Necesaria | Media |
| RF-06 | CRUD Historial Local | Media |

