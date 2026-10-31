# Instalación de tornillos con botón

Los tornillos se colocan seleccionando un punto numerado y pulsando «Insertar».
La animación termina antes de actualizar el contador. No se pueden duplicar ni
instalar sin la pieza necesaria. Las piezas conservan su arrastre, giro y alineación.

Alcance: 9 fijaciones de placa PC, 4 del cierre del gabinete y 18 de laptop,
con los puntos que ya tenía el simulador. No se añadieron anclajes a otros componentes.
El cierre del gabinete solo habilita la estación cuando termina la última fijación.
Los pasos de tornillos usan esta mecánica también en modo clásico.

Archivos creados:

- `src/scene/ScrewPlacement.tsx`: puntos seleccionables, botón, animación y enfoque.
- `src/domain/screwPlacement.ts`: validación de selección, inserción y reinicio.
- `src/domain/screwPlacement.test.ts`: pruebas de duplicados, dependencias y progreso.
- `CAMBIOS_TORNILLOS.md`: este resumen.

Archivos modificados:

- `src/scene/ManualPlacement.tsx`
- `src/scene/CaseClosureScrews.tsx`
- `src/scene/PcModelAssembly.tsx`
- `src/scene/LaptopScene.tsx`
- `src/scene/manualPlacement.css`
- `src/App.tsx`
- `src/features/laptop/LaptopWorkspace.tsx`
- `src/features/assembly/ProgressPanel.tsx`
- `src/features/assembly/PartDetails.tsx`
- `src/features/catalog/CatalogPanel.tsx`

Validación: build y lint correctos; 84/84 tests pasan. Comprobados doble clic,
selección sin instalar, contador al completar animación, índices inválidos,
reinicio, bloqueo de estación y encendido, retirada y reinstalación.
Modelos GLB, lógica de alineación de piezas y Beta ARGB conservados (hashes iguales).
El servidor local sirve el módulo actualizado en el puerto 5173.
Pendiente: prueba visual de interacción, porque el navegador automatizado no estaba disponible.

Respaldo completo verificado (13 503 archivos):
`C:\Users\USUARIO\Documents\PROYECTOS RANDOM\BACKUP_UNDC_TORNILLOS_BOTON_20261012_155603`.
No se realizó push ni despliegue.
