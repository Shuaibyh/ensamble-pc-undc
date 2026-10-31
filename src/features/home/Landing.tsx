import { useState, type MouseEvent } from 'react';
import { receivedModels } from '../../data/receivedModels';
import './landing.css';

import type { HomeSection } from '../../navigation';

type ModuleView = 'assembly' | 'library' | 'laptop';

const modules: {
  view: ModuleView;
  title: string;
  description: string;
  image: string;
  action: string;
  badges: string[];
}[] = [
  {
    view: 'assembly',
    title: 'Ensamblar PC',
    description:
      'Instala los componentes, realiza el cableado interno, cierra el gabinete, conecta los periféricos y enciende el equipo.',
    image: '/landing/previews/ensamblar-pc.png',
    action: 'Comenzar ensamblaje',
    badges: ['3D', 'Guiado'],
  },
  {
    view: 'laptop',
    title: 'Ensamblar laptop',
    description: 'Instala los componentes internos, conecta, cierra y enciende tu laptop.',
    image: '/landing/previews/ensamblar-laptop.png',
    action: 'Armar laptop',
    badges: ['3D', 'Interactivo'],
  },
  {
    view: 'library',
    title: 'Explorar modelos',
    description: 'Examina los recursos 3D, sus descripciones, autores y licencias.',
    image: '/landing/previews/explorar-modelos.png',
    action: 'Explorar modelos',
    badges: [`${receivedModels.length} modelos`, 'Educativo'],
  },
];

const learningPath = [
  ['01', 'Explora', 'Reconoce los componentes y comprende para qué sirve cada uno.', 'Observa'],
  ['02', 'Ensambla', 'Coloca las piezas respetando el orden y sus dependencias.', 'Construye'],
  [
    '03',
    'Conecta',
    'En el recorrido de PC, completa el cableado interno y conecta la estación de trabajo.',
    'Relaciona',
  ],
  ['04', 'Comprueba', 'Verifica el montaje antes del encendido simulado.', 'Valida'],
];

const technologies = [
  ['React 19', 'Organiza la interfaz, las pantallas y los componentes interactivos.'],
  ['TypeScript', 'Tipa estados, props, piezas, conexiones y reglas del ensamblaje.'],
  ['Vite', 'Proporciona el entorno de desarrollo y genera la compilación final.'],
  ['Three.js', 'Renderiza y transforma los modelos, materiales, luces y cámaras 3D.'],
  ['React Three Fiber', 'Integra las escenas de Three.js dentro de componentes React.'],
  ['Drei', 'Aporta loaders GLTF, etiquetas HTML y utilidades para las escenas.'],
] as const;

const gallery = [
  {
    image: '/landing-final/imagenes/institucional/01_campus_patio_principal.png',
    label: 'Campus universitario',
  },
  {
    image: '/landing-final/imagenes/institucional/02_facultad_grupo_banner.png',
    label: 'Facultad de Ingeniería',
  },
  {
    image: '/landing-final/imagenes/institucional/03_facultad_desfile.png',
    label: 'Comunidad universitaria',
  },
  {
    image: '/landing-final/imagenes/institucional/04_facultad_actividad_campus.png',
    label: 'Actividad académica',
  },
  {
    image: '/landing-final/imagenes/institucional/05_auditorio_evento.png',
    label: 'Actividad académica en auditorio',
  },
];

function ProfileIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="17" r="8" />
      <path d="M10 40c1.2-9 6.2-14 14-14s12.8 5 14 14" />
    </svg>
  );
}

export function Landing({
  onOpen,
  onSection,
}: {
  onOpen: (view: ModuleView) => void;
  onSection: (section: HomeSection) => void;
}) {
  const [creditSearch, setCreditSearch] = useState('');
  const matchingCredits = receivedModels.filter((model) =>
    `${model.name} ${model.author}`
      .toLocaleLowerCase('es')
      .includes(creditSearch.toLocaleLowerCase('es')),
  );
  const [technology, setTechnology] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryItem = gallery[galleryIndex];
  function moveGallery(direction: number) {
    setGalleryIndex((current) => (current + direction + gallery.length) % gallery.length);
  }
  function scrollToProject(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onSection('proyecto');
  }
  return (
    <main className="landing">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="hero-copy">
          <span className="eyebrow">Laboratorio Interactivo de Hardware UNDC</span>
          <h1 id="landing-title">Aprende hardware construyendo en 3D.</h1>
          <p>Ensamblaje de PC y laptop, exploración de componentes y conexiones en 3D.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => onOpen('assembly')}>
              Comenzar
            </button>
            <a className="button ghost" href="/proyecto" onClick={scrollToProject}>
              Conocer el proyecto
            </a>
          </div>
          <div className="hero-trust" aria-label="Instituciones participantes">
            <img
              src="/landing-final/imagenes/institucional/logo_undc.png"
              alt="Universidad Nacional de Cañete"
            />
            <img
              src="/landing-final/imagenes/institucional/logo_facultad_ingenieria.png"
              alt="Facultad de Ingeniería"
            />
            <span>
              Universidad Nacional de Cañete
              <small>Facultad de Ingeniería · Ingeniería de Sistemas</small>
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Vista previa del simulador">
          <img
            className="hero-station"
            src="/landing/previews/conectar-estacion.png"
            alt="Estación completa con PC, monitor, mesa, teclado y mouse"
          />
        </div>
      </section>

      <section className="landing-section" id="experiencias">
        <div className="section-heading">
          <span className="eyebrow">Experiencias disponibles</span>
          <h2>¿Qué quieres hacer?</h2>
          <p>Elige una experiencia. Ensamblar PC incluye las conexiones y el encendido.</p>
        </div>
        <div className="module-grid">
          {modules.map((module) => (
            <article className={`module-card module-card-${module.view}`} key={module.view}>
              <div className="module-image">
                <img src={module.image} alt="" />
                <div className="module-badges">
                  {module.badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <button className="module-link" onClick={() => onOpen(module.view)}>
                  {module.action} <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section learning-section" aria-labelledby="learning-title">
        <div className="section-heading">
          <span className="eyebrow">Ruta de aprendizaje</span>
          <h2 id="learning-title">Del componente al equipo completo</h2>
        </div>
        <ol className="learning-path">
          {learningPath.map(([number, title, text, result]) => (
            <li key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
                <small>{result}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section mode-section" aria-labelledby="modes-title">
        <div className="section-heading">
          <span className="eyebrow">Dos formas de avanzar</span>
          <h2 id="modes-title">Aprende con ayuda o pon a prueba lo aprendido</h2>
        </div>
        <div className="mode-cards">
          <article>
            <i aria-hidden="true">?</i>
            <span>Modo guiado</span>
            <h3>Aprender</h3>
            <p>Recibe indicaciones, ubicaciones y explicaciones durante cada etapa.</p>
            <ul>
              <li>Orden de montaje visible</li>
              <li>Ayudas para ubicar cada pieza</li>
              <li>Explicaciones de uso y conexión</li>
            </ul>
          </article>
          <article>
            <i aria-hidden="true">✓</i>
            <span>Modo evaluación</span>
            <h3>Practicar</h3>
            <p>Completa el montaje con menos asistencia y revisa tus intentos al finalizar.</p>
            <ul>
              <li>Decisiones sin ubicación automática</li>
              <li>Registro de intentos y errores</li>
              <li>Comprobación final del equipo</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="landing-section project-section" id="proyecto">
        <div>
          <span className="eyebrow">Sobre el proyecto</span>
          <h2>Un entorno educativo para comprender el hardware</h2>
          <p>
            Laboratorio Interactivo de Hardware UNDC reúne simulación 3D, contenidos breves y
            validación paso a paso para enseñar cómo se organizan, instalan y conectan los
            componentes de una computadora.
          </p>
          <p>
            Cada experiencia convierte el montaje en una actividad observable: el estudiante puede
            examinar una pieza, conocer su función, colocarla en el orden correcto y comprobar cómo
            se relaciona con el resto del sistema.
          </p>
          <p>
            El proyecto fue desarrollado con apoyo de herramientas de inteligencia artificial
            durante el proceso de programación y desarrollo.
          </p>
          <div className="project-pillars">
            <span>
              <strong>Visual</strong> Modelos manipulables en tiempo real
            </span>
            <span>
              <strong>Progresivo</strong> Dependencias y pasos verificables
            </span>
            <span>
              <strong>Práctico</strong> Montaje, conexiones y encendido
            </span>
          </div>
        </div>
        <div className="project-console">
          <div className="project-metrics">
            <span>
              <strong>{modules.length}</strong> experiencias
            </span>
            <span>
              <strong>{receivedModels.length}</strong> modelos 3D
            </span>
            <span>
              <strong>2</strong> modos
            </span>
          </div>
          <div className="technology-list" role="tablist" aria-label="Tecnologías verificadas">
            {technologies.map(([name], index) => (
              <button
                key={name}
                role="tab"
                aria-selected={technology === index}
                onClick={() => setTechnology(index)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="technology-detail" role="tabpanel" aria-live="polite">
            <strong>{technologies[technology][0]}</strong>
            <p>{technologies[technology][1]}</p>
          </div>
        </div>
      </section>

      <section className="landing-section faculty-section" id="facultad">
        <div className="faculty-gallery">
          <img
            key={galleryItem.image}
            src={galleryItem.image}
            alt={galleryItem.label}
            loading="lazy"
          />
          <div className="gallery-controls">
            <button aria-label="Imagen institucional anterior" onClick={() => moveGallery(-1)}>
              ←
            </button>
            <span>{galleryItem.label}</span>
            <button aria-label="Siguiente imagen institucional" onClick={() => moveGallery(1)}>
              →
            </button>
          </div>
          <div className="gallery-dots" aria-label="Seleccionar imagen institucional">
            {gallery.map((item, index) => (
              <button
                key={item.image}
                aria-label={item.label}
                aria-pressed={galleryIndex === index}
                onClick={() => setGalleryIndex(index)}
              />
            ))}
          </div>
        </div>
        <div className="faculty-content">
          <span className="eyebrow">Nuestra institución</span>
          <h2>Universidad Nacional de Cañete</h2>
          <p>
            Facultad de Ingeniería
            <br />
            Escuela Profesional de Ingeniería de Sistemas
          </p>
          <p>
            Formación orientada a crear soluciones tecnológicas, investigar y aplicar sistemas
            digitales a problemas reales.
          </p>
          <div className="faculty-highlights" aria-label="Áreas de formación">
            <span>Software y sistemas de información</span>
            <span>Redes y tecnologías de comunicación</span>
            <span>Datos e inteligencia artificial</span>
            <span>Innovación y realidad virtual</span>
          </div>
          <div className="faculty-logos">
            <img
              src="/landing-final/imagenes/institucional/logo_undc.png"
              alt="Logo de la Universidad Nacional de Cañete"
            />
            <img
              src="/landing-final/imagenes/institucional/logo_facultad_ingenieria.png"
              alt="Logo de la Facultad de Ingeniería"
            />
          </div>
        </div>
      </section>

      <section className="landing-section team-section" id="equipo">
        <div className="section-heading">
          <span className="eyebrow">Equipo del proyecto</span>
          <h2>Desarrollo y acompañamiento académico</h2>
        </div>
        <div className="team-grid">
          <article>
            <span className="team-avatar">
              <ProfileIcon />
            </span>
            <div>
              <h3>Brandon Dennis Sarmiento Loza</h3>
              <p>Estudiante de Ingeniería de Sistemas — II ciclo</p>
              <small>Desarrollo e implementación del proyecto</small>
            </div>
          </article>
          <article>
            <span className="team-avatar">
              <ProfileIcon />
            </span>
            <div>
              <h3>Dr. Richard Condori Cruz</h3>
              <p>Asesor académico</p>
              <small>Orientación y acompañamiento durante el desarrollo del proyecto</small>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-section credits-section" id="creditos">
        <div className="section-heading">
          <span className="eyebrow">Créditos y licencias</span>
          <h2>Recursos 3D con atribución</h2>
          <p>
            El proyecto conserva la autoría, fuente y licencia de los {receivedModels.length}{' '}
            modelos publicados.
          </p>
        </div>
        <details>
          <summary>Consultar autores y licencias</summary>
          <label className="credit-search">
            Buscar modelo o autor
            <input
              type="search"
              value={creditSearch}
              onChange={(event) => setCreditSearch(event.target.value)}
              placeholder="Ej.: laptop, placa madre…"
            />
          </label>
          <p role="status">{matchingCredits.length} recursos encontrados</p>
          <ul>
            {matchingCredits.map((model) => (
              <li key={model.id}>
                <a href={model.source} target="_blank" rel="noreferrer">
                  {model.name}
                </a>
                <span>
                  {model.author} · {model.license ?? 'CC BY 4.0'}
                </span>
              </li>
            ))}
          </ul>
        </details>
        <div className="credits-finale">
          <span>Laboratorio abierto</span>
          <strong>Continúa explorando el hardware en 3D</strong>
          <p>Consulta cada modelo, su procedencia y la licencia con la que fue incorporado.</p>
          <button className="button secondary" onClick={() => onOpen('library')}>
            Ver modelos en 3D
          </button>
        </div>
      </section>
    </main>
  );
}
