# Migración híbrida de PC — cREAgal

Se conserva el reductor de ensamblaje, IDs principales, dependencias, evaluación, mensajes, rutas y progreso. El nuevo GLB proporciona la geometría y las transformaciones finales.

## Recursos y decisiones

- Los GLB reenviados son idénticos entre sí; también lo son los dos ZIP.
- Fuente elegida: `source/personal_computer.glb` del ZIP, con 167 nodos, 97 mallas, 33 materiales y 34 imágenes. El GLB suelto tiene 267 nodos y envoltorios adicionales.
- Producción: `public/models/creagal/desktop.glb`, 31.087.100 bytes frente a 83.349.428 bytes del fuente (63 % menos).
- Optimización: eliminación de UV sin uso, deduplicación exacta de vértices, texturas hasta 2048 px y compresión Meshopt. Sin decimación de triángulos; jerarquía y matrices conservadas. Los originales en Descargas permanecen intactos.

| Elemento                               | Decisión                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Gabinete, placa y componentes soldados | Nuevo GLB; placa como unidad lógica                                                                    |
| CPU, refrigeración, RAM, GPU y fuente  | Grupos originales, matrices mundiales conservadas                                                      |
| Almacenamiento                         | Dos unidades SATA originales, agrupadas pedagógicamente                                                |
| Ventilación de gabinete                | Un ventilador original; no se añaden tres ventiladores sin soporte                                     |
| Separadores y tornillos de placa       | Grupos originales `stands` y `Bolt`                                                                    |
| Pasta térmica                          | Se conserva la jeringa anterior, la animación y la dependencia CPU → pasta → refrigeración             |
| ATX, CPU, GPU y datos SATA             | Cableado separable del nuevo GLB                                                                       |
| Alimentación SATA y ventiladores       | Recorridos educativos adaptados, sin simulación eléctrica                                              |
| Cierre                                 | Contraparte simétrica adaptada del panel original para el lado abierto; tornillos del recurso anterior |

`pcModel.ts` define el mapeo de nodos; `preparePcModel.ts` conserva `matrixWorld` y comparte geometrías/materiales sin duplicar el modelo entero. `pcTargets.json` registra los límites calculados; `pcCatalog.ts` adapta los datos educativos. `PcModelAssembly.tsx` y `PcScene.tsx` contienen la escena nueva.

La estación mantiene su gabinete y puertos anteriores. Al completar el nuevo PC se habilita su representación de referencia anterior. Laptop no se modifica. El explorador recibe soporte Meshopt y el catálogo/los créditos incorporan el modelo nuevo. Los archivos y recursos anteriores se conservan; `migration-backup/` guarda las versiones previas de los archivos sobrescritos.

## Verificación

- 67 pruebas aprobadas: reglas, modos, conexiones, restauración, recursos, equivalencia de matrices y requisito de pasta térmica.
- TypeScript, ESLint y build aprobados.
- Flujo UI completo en Chrome para Aprender y Practicar: reiniciar, instalar 11 pasos, conectar 7 circuitos educativos, cerrar y encender. Sin excepciones detectadas.
- Revisión de escena en 1920×1080, 1440×900, 1366×768 y móvil; cámara adaptable y controles móviles sin recorte.
- Prueba local sin caché: transferencia del GLB ~211 ms; 99 llamadas de dibujo por cuadro; heap JavaScript ~39 MB. No son tiempos de Internet ni una medición de memoria GPU. El bloque compartido de Three.js mantiene la advertencia de tamaño de Vite.
- Evidencias de pruebas y capturas: `frontend/audit-screenshots/pc-*`.
- Sin commits ni publicación. El progreso nuevo usa una clave propia y no borra el progreso anterior.

## Atribución

**“Partes de un ordenador de sobremesa” — Proxecto cREAgal**. [Fuente](https://skfb.ly/oQztw). [CC Attribution-NonCommercial-ShareAlike 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Adaptaciones: optimización de recursos, separación pedagógica y panel opuesto simétrico. Las adaptaciones del modelo mantienen CC BY-NC-SA 4.0; se conservan los créditos de los recursos anteriores.
