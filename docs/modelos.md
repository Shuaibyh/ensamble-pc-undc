# Preparar y añadir recursos 3D

## Estado real

Gaming PC Case está integrado como vista de exploración en `scene/ReceivedCaseViewer.tsx`; su ruta y créditos están en `data/receivedCase.ts`. El GLB público está en `public/models/cases/nightshark.glb`. Se conserva el original, junto al ZIP con FBX y textura, en `assets-source/gaming-pc-case/`. Su inspección está en `asset-inspection/nightshark.md`: necesita preparación para ensamblaje. El gabinete del ejercicio, las siete piezas y los ventiladores siguen construidos con geometría propia. Las ocho miniaturas SVG se generan con `node assets-source/generate-thumbnails.mjs` desde la raíz.

## Organización de recursos al incorporarlos

Guarda originales `.blend`, descargas sin modificar y texturas originales en `assets-source/`. Esta carpeta está fuera de la raíz publicada por Vite.

Exporta solo recursos de ejecución a `frontend/public/`:

| Carpeta que se creará con sus archivos | Uso                                         |
| -------------------------------------- | ------------------------------------------- |
| `models/cases/`                        | Gabinetes con interior y panel separado     |
| `models/motherboards/`                 | Placas madre                                |
| `models/cpus/`                         | Procesadores                                |
| `models/gpus/`                         | Gráficas                                    |
| `models/ram/`                          | Memorias                                    |
| `models/storage/`                      | SSD                                         |
| `models/cooling/`                      | Refrigeración y ventiladores                |
| `models/power-supplies/`               | Fuentes                                     |
| `textures/`                            | Texturas compartidas si no están embebidas  |
| `thumbnails/`                          | SVG actuales y futuros renders              |
| `branding/`                            | Logo oficial que proporcione la universidad |

Las fichas técnicas, enlaces, licencia, atribución y registro de modificaciones pertenecen a `docs/`. No creamos subcarpetas de modelos vacías hasta tener archivos reales.

## En Blender

1. Verifica licencia de reutilización y conserva una copia de la información de origen.
2. Inspecciona el árbol de objetos: placa, gabinete y piezas deben separarse. No uses un PC entero fusionado para fingir piezas manipulables.
3. Revisa dimensiones de cada pieza y anclajes en conjunto. El prototipo usa coordenadas didácticas, no una escala comercial certificada. Establece una conversión uniforme de unidades antes de importar modelos dimensionados; no achiques una GPU para hacerla caber.
4. En este visor Y apunta arriba y Z hacia el lado abierto. Define un origen o punto de anclaje reproducible y orienta el modelo en relación a él.
5. Mantén panel lateral y objetos móviles separados. El GLB del chasis debe representar el chasis abierto; el panel provisional se dibuja por separado en `Chassis`.
6. Reduce polígonos, fusiona materiales repetidos y limita texturas; comprueba UV y rutas. Conserva dependencias juntas si no usas texturas embebidas.
7. Exporta GLB con materiales y texturas embebidas, **sin compresión Draco ni Meshopt** en esta primera integración. Así no hacen falta decodificadores externos.
8. Comprueba tamaño, posición, materiales y encuadre dentro de la aplicación antes de dar el recurso por terminado.

## Integración por componente

En `frontend/src/data/catalog.ts`, modifica `asset` del componente correspondiente:

```typescript
asset: {
  modelPath: '/models/cpus/cpu-educativa.glb',
  thumbnailPath: '/thumbnails/cpu.webp',
  scale: [1, 1, 1],
  rotation: [0, 0, 0], // Radianes
  anchor: [0, 0, 0], // Punto del modelo que coincide con la posición de montaje
  author: 'Autor real',
  source: 'URL original',
  license: 'Licencia verificada y enlace',
  modifications: 'Cambios realizados',
}
```

La ruta es un ejemplo; **ese archivo no existe**. El catálogo construye metadatos predeterminados en un `map`; añade una tabla de recursos por ID o una excepción explícita para la pieza que realmente sustituyas. No cambies `depends` para compensar una geometría incorrecta. `position` es la ubicación en el gabinete y `size` define la caja de resaltado del modelo provisional; actualízala a dimensiones reales verificadas cuando sustituyas el recurso.

`ModelAsset` resta el anclaje del origen local, aplica orientación y escala, y `InstalledPart` coloca el conjunto en la posición de montaje. Usa `Clone` para no compartir un objeto de escena mutable entre instancias. No precarga el catálogo completo.

Si el GLB falla por ruta ausente o contenido inválido, un límite de errores exclusivo de ese recurso muestra `ProceduralPart` y un aviso. Durante la carga también se muestra el provisional y un indicador. Cambiar de URL reinicia el límite; para reintentar la misma URL después de reemplazar el archivo, recarga la página.

## Miniaturas y logo

Para mejores miniaturas, renderiza cada pieza por separado con el mismo ángulo, luz, fondo y encuadre. Exporta preferiblemente WebP con relación aproximada 7:6 y actualiza `thumbnailPath`. No necesitas crear un lienzo WebGL por tarjeta. Si una imagen falta, la tarjeta conserva su nombre y estado sin mostrar un icono roto.

Cuando se proporcione el logo, guárdalo en `public/branding/` y sustituye el recuadro `logo-slot` en `App.tsx` por una imagen con texto alternativo. No hay logo inventado.

## Prueba manual del respaldo GLB

Temporalmente asigna a una sola pieza `modelPath: '/models/no-existe.glb'`, instálala y comprueba que aparecen su geometría provisional y el aviso. Repite con un archivo `.glb` de contenido inválido. Después restaura `modelPath: null`. Esta prueba necesita navegador con WebGL; la compilación por sí sola no la verifica.
