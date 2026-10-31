# Fuentes, autores y licencias de recursos

El usuario proporcionó el GLB y el ZIP original de Gaming PC Case. Se conservan en `assets-source/gaming-pc-case/`. El GLB está incorporado a una vista de exploración independiente, servido desde `frontend/public/models/cases/nightshark.glb`. Su interior aún no se utiliza para ensamblar.

## Recursos incorporados

| Recurso                                       | Autor y fuente                                                                | Licencia externa                                | Modificaciones                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Gabinete y ventiladores geométricos           | Implementación original de Ensamble PC UNDC, `Chassis.tsx` y `primitives.tsx` | No aplica; recurso propio, sin licencia externa | Interior abierto, panel translúcido opcional, ventiladores animados |
| Placa, CPU, disipador, RAM, SSD, GPU y fuente | Implementación original del proyecto, `ProceduralPart.tsx`                    | No aplica; recurso propio, sin licencia externa | Geometrías simplificadas y materiales diferenciados                 |
| Ocho miniaturas SVG                           | Generador propio `assets-source/generate-thumbnails.mjs`                      | No aplica; recurso propio, sin licencia externa | Proyección, paleta y fondo uniformes                                |
| Logo UNDC                                     | Pendiente de recibir                                                          | Pendiente                                       | No integrado; solo recuadro de reserva                              |

No se ha copiado código, marca, capturas ni recursos de BuildCores o Cisco Virtual Desktop. No se atribuye identidad comercial a las geometrías. Las menciones AM5, DDR5, PCIe y M.2 describen la configuración didáctica.

## Recurso incorporado a exploración; montaje interior pendiente

**Gaming PC Case**, por **dylanheyes**:
https://sketchfab.com/3d-models/gaming-pc-case-5f9261fef2874bf9ae39dd0f4029e978

Crédito proporcionado por el usuario y coincidente con los metadatos del GLB:

“Gaming PC Case” (https://skfb.ly/oID8F) by dylanheyes is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).

Se recibieron `gaming_pc_case.glb` y `gaming-pc-case.zip`. El ZIP contiene `source/Nightshark.fbx` y `textures/internal_ground_ao_texture.jpeg`. Los originales se conservan sin modificar. El GLB contiene 378.700 triángulos, seis mallas, tres materiales, ninguna animación y ninguna imagen embebida. La ventana está separada; el resto está agrupado bajo nombres de materiales, sin objetos independientes identificados como tornillos o ventiladores.

La lámina de diagnóstico en `docs/asset-inspection/nightshark-geometry.png` deriva de este modelo: se ocultó la ventana y se representó el material negro en gris para inspeccionar geometría. No es una captura del simulador ni una modificación del archivo original. Autor original: dylanheyes; licencia CC BY 4.0; transformación diagnóstica realizada para Ensamble PC UNDC.

Adaptaciones de la vista incorporada: centrado y escala uniforme de exhibición, ventana original con visibilidad conmutable y materiales clonados para ofrecer acabado gris opcional, menor brillo azul y transparencia de ventana ajustada. Los controles permiten volver a los materiales originales. No se altera la geometría ni el GLB original. Créditos y enlace de licencia visibles en la interfaz.

Pasos antes de utilizarlo para ensamblar:

1. Preparar el FBX en una herramienta de modelado: separar elementos y construir o verificar bandeja de placa, separadores y compartimento de fuente.
2. Revisar dimensiones del conjunto sin deformar los componentes para aparentar compatibilidad.
3. Reducir detalle y ajustar el material principal negro puro, de rugosidad cero, para una presentación legible.
4. Exportar el chasis abierto preparado y comprobarlo en el simulador antes de sustituir la geometría funcional.

Informe: `docs/asset-inspection/nightshark.md`. No se ha certificado compatibilidad dimensional ni desmontaje de todas las piezas.

## Seis componentes recibidos e incorporados a la biblioteca

Todos bajo [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/), según los créditos proporcionados y metadatos de los GLB.

| Modelo                                | Autor proporcionado | Fuente                | Archivo publicado            |
| ------------------------------------- | ------------------- | --------------------- | ---------------------------- |
| PSU Power Supply Unit                 | Groovex             | https://skfb.ly/oBPC9 | power-supplies/psu.glb       |
| Storage (SSD, HDD, M.2)               | Vivien Deroche      | https://skfb.ly/6SNzv | storage/storage.glb          |
| RTX3090 (Low Poly)                    | JDwastaken          | https://skfb.ly/o9IHr | gpus/gpu.glb                 |
| MotherBoard + Components              | Daniel Cardona      | https://skfb.ly/6RDsX | motherboards/motherboard.glb |
| TEAMGROUP T-FORCE DELTA DDR5 DDR4 RAM | PolyDavid           | https://skfb.ly/pGSQW | ram/ram.glb                  |
| CPU Cooler                            | Fochdog             | https://skfb.ly/onuBI | cooling/cooler.glb           |

Rutas relativas a `frontend/public/models/`. Se conservan las descargas GLB y ZIP en `assets-source/`.
El GLB de almacenamiento registra al autor como Blue Lantern (genoris2); se conservan ambos créditos.
El GLB de la fuente registra la cuenta dhafintaufiqi21; se mantiene también el nombre Groovex proporcionado.
Modificaciones: ninguna al archivo; el visor centra y escala uniformemente para exhibición.
En la placa se controla la visibilidad y se anima la posición de los grupos originales CPU, M2, RAM, RAM1, RAM2, RAM3 y MotherBoard.
Estas acciones no certifican compatibilidad dimensional ni eléctrica con el gabinete o las otras descargas.

## Adaptación para ensamblaje dentro del gabinete

Los modelos anteriores ahora se usan en el montaje principal. Se orientan y escalan uniformemente.
Se separa `MotherBoard` de CPU, M2 y RAM originales; se usa `CPU` del mismo archivo como pieza independiente.
Se extrae `Cube_3` del paquete Storage para el M.2 y se excluye el tornillo flotante `Cone_45` de PSU.
La carcasa separa su ventana y triángulos laterales en memoria; se aclaran los plásticos, se reduce la emisión RGB y se añaden soportes didácticos propios.
Los archivos originales permanecen intactos. Véase `montaje-integrado.md`.

Los logos de Ingeniería y UNDC son las imágenes entregadas por el estudiante, copiadas sin modificación desde `LOGO FACULTAD.png` y `LOGO UNDC.png`. No se les atribuye la licencia CC BY de los modelos; sus derechos corresponden a la institución.

## Gabinete actual: Corsair 4000D

“Corsair 4000D PC case”, por **SzaBa**. Fuente: https://skfb.ly/oFS8V . Licencia: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
El usuario proporcionó GLB y ZIP, archivados sin modificar en `assets-source/corsair-4000d/`.
Copia publicada: `frontend/public/models/cases/corsair-4000d.glb`.
Modificaciones en memoria: orientación, escala uniforme, color base legible, cristal aclarado, cubierta de fuente separada por caras completas y giro de ventiladores mediante sus grupos originales.
Detalles y límites: `corsair-4000d.md`. No se ha certificado fidelidad dimensional al producto comercial.

## Documentación técnica consultada

## Periféricos de la estación

Todos se publican sin modificar como GLB y se transforman en memoria con escala uniforme:

| Recurso                   | Autor         | Fuente                | Licencia  |
| ------------------------- | ------------- | --------------------- | --------- |
| Monitor                   | portgl16      | https://skfb.ly/onBo6 | CC BY 4.0 |
| Computer Mouse (low-poly) | LagzDesign    | https://skfb.ly/oWQYs | CC BY 4.0 |
| Mechanical keyboard       | FelikinRuslan | https://skfb.ly/6R68t | CC BY 4.0 |

Los GLB y ZIP originales están en `assets-source/peripherals/`; las copias web en `frontend/public/models/peripherals/`. Los cables, puertos y la lógica interactiva son una representación propia del proyecto.

## Detalles de montaje recibidos

| Recurso                               | Autor         | Fuente                                              | Licencia                                    |
| ------------------------------------- | ------------- | --------------------------------------------------- | ------------------------------------------- |
| 120mm Computer Fans                   | kusuma844     | https://skfb.ly/pqIP8                               | CC BY 4.0                                   |
| M3_standOff                           | YasamN        | https://skfb.ly/oyEAD                               | CC BY 4.0                                   |
| Simple Screw                          | Johannes R.   | https://skfb.ly/6nyUP                               | CC BY 4.0                                   |
| Chinese Ice Cool Master Thermal Paste | deltaxsketchy | https://skfb.ly/os6DY                               | CC BY 4.0                                   |
| Connector - Usb - Charger             | re1monsen     | https://skfb.ly/ornqI                               | CC BY 4.0                                   |
| [CC0] European Power Plug             | literallylara | https://skfb.ly/6WVvZ                               | CC BY 4.0 según los créditos proporcionados |
| Fan header socket 3/4 pin             | DrLex0        | https://github.com/DrLex0/print3d-fan-header-socket | CC BY 4.0                                   |

Los originales y ZIP se conservan en `assets-source/assembly-details/`. El STL del
conector de ventilador se convirtió a GLB, sin alterar el original. Los cuatro
ventiladores integrados en el gabinete Corsair permanecen en el GLB original y se
ocultan solamente en el ejercicio para comenzar con un chasis vacío.

El modelo de pasta recibido es un envase escaneado, no una jeringa. El USB recibido es
un conjunto de adaptadores y no se usa como una clavija USB-A falsa. La aplicación
genera la capa de pasta y las clavijas compatibles, mientras conserva esos recursos
en la biblioteca con su descripción correcta.

Modificaciones en memoria: se retiran `wire` y `usb` del clon del teclado para sustituir
el cable decorativo por la conexión interactiva; se gira el mouse 90 grados; se oculta
`Cube_RenderMonitor_0` del monitor y se reemplaza por una pantalla propia de encendido
simulado. Los tres cuerpos se escalan uniformemente y se apoyan por su base. No se
modifican los archivos originales ni se atribuye la interfaz del proyecto a sus autores.

- React Three Fiber: https://r3f.docs.pmnd.rs/getting-started/introduction
- Drei, carga GLTF: https://drei.docs.pmnd.rs/loaders/gltf-use-gltf
- Drei, Clone: https://drei.docs.pmnd.rs/abstractions/clone
- ESLint, configuración: https://eslint.org/docs/latest/use/configure/configuration-files
- typescript-eslint: https://typescript-eslint.io/users/configs/

Las dependencias npm mantienen sus propias licencias en sus paquetes y están identificadas por `frontend/package-lock.json`. Esta tabla es de recursos visuales, no sustituye las licencias de bibliotecas.

## Ensamblaje de laptop

| Recurso                                  | Autor            | Fuente                | Licencia        | Uso                                                         |
| ---------------------------------------- | ---------------- | --------------------- | --------------- | ----------------------------------------------------------- |
| Laptop                                   | Alpha            | https://skfb.ly/pFWYB | CC BY 4.0       | Carcasa y pantalla de la vista de servicio                  |
| FrameWork Laptop mainboard and internals | Photo_Max        | https://skfb.ly/osUnQ | CC BY 4.0       | Interior real, dividido por regiones sin deformar su escala |
| Laptop Acer                              | Romain DI CORATO | https://skfb.ly/oqPtN | CC BY 4.0       | Exterior terminado con teclado y touchpad separados         |
| Phillips #00 Screw                       | swedenstyle      | https://skfb.ly/pqRZA | CC BY-NC-SA 4.0 | Seis fijaciones visibles únicamente desde la cara inferior  |

Los GLB originales se conservan en `assets-source/laptop/`. La aplicación crea copias
en memoria, aplica escala uniforme y coloca cada conjunto en el chasis; los archivos
recibidos no se sobrescriben. Las cintas flexibles, conectores pequeños y la pantalla
de encendido son recursos educativos creados por el proyecto.

## Recursos adicionales recibidos para mejorar cableado y escena final

| Recurso                                          | Autor           | Fuente                                                      | Licencia                  | Uso en el prototipo                                                                                                         |
| ------------------------------------------------ | --------------- | ----------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Basic PC case                                    | Sousinho        | https://skfb.ly/oyEOo                                       | CC BY 4.0                 | Biblioteca de modelos; referencia de gabinete vacio. No reemplaza el montaje principal porque trae ventiladores integrados. |
| Low poly PC Cable                                | Paul            | https://skfb.ly/6WMSY                                       | CC BY 4.0                 | Biblioteca y referencia para cables de PC.                                                                                  |
| Power Cable Wiring                               | Mehdi Shahsavan | https://skfb.ly/oSKIF                                       | CC BY 4.0                 | Cable visible de referencia en la estacion completa.                                                                        |
| Power Plug /-Outlet /-Adapter \| Connector Strip | BlackCube       | https://skfb.ly/ooUPN                                       | CC BY 4.0                 | Regleta/tomacorriente en la estacion completa.                                                                              |
| computer fan                                     | Temoor          | https://skfb.ly/o76tH                                       | CC BY 4.0                 | Biblioteca como ventilador alternativo.                                                                                     |
| Molex 39012240 / 5557-24R                        | Molex           | https://www.molex.com/en-us/products/part-detail/0039012240 | Modelo CAD del fabricante | Archivo STEP archivado en assets-source/assembly-details; requiere conversion a GLB para uso directo.                       |
| Molex 39012080                                   | Molex           | https://www.molex.com/                                      | Modelo CAD del fabricante | Archivo STEP archivado en assets-source/assembly-details; requiere conversion a GLB para uso directo.                       |
