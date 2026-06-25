// Datos de detalle de productos de seguros — Vera Seguros
// Fuente única consumida por Producto.dc.html

export const LOGOS = {
  sura: 'assets/lg/sura.png', arlsura: 'assets/lg/arl-sura.png', bolivar: 'assets/lg/bolivar.png',
  allianz: 'assets/lg/allianz.png', axa: 'assets/lg/axa-colpatria.png', hdi: 'assets/lg/hdi.png',
  sbs: 'assets/lg/sbs.png', solidaria: 'assets/lg/solidaria.png', emi: 'assets/lg/emi.png',
  assist: 'assets/lg/assist-card.png', mapfre: 'assets/lg/mapfre.png', chubb: 'assets/lg/chubb.png',
  zurich: 'assets/lg/zurich.png', estado: 'assets/lg/estado.png', qualitas: 'assets/lg/qualitas-v2.png',
  mundial: 'assets/lg/mundial.png',
};

export function companiesFor(raw) {
  const n = (raw || '').toLowerCase();
  const L = (...k) => k.map(x => LOGOS[x]);
  if (n.includes('soat')) return L('sura', 'axa', 'mapfre', 'solidaria', 'estado');
  if (n.includes('moto') || n.includes('auto')) return L('sura', 'allianz', 'axa', 'hdi', 'mapfre', 'qualitas', 'solidaria', 'mundial');
  if (n.includes('hogar')) return L('sura', 'bolivar', 'mapfre', 'allianz', 'solidaria', 'mundial');
  if (n.includes('arrend')) return L('bolivar', 'sura', 'solidaria');
  if (n.includes('viaje')) return L('assist', 'sura');
  if (n.includes('salud') || n.includes('emi') || n.includes('eps')) return L('sura', 'axa', 'emi', 'bolivar', 'allianz');
  if (n.includes('exequias')) return L('bolivar', 'solidaria');
  if (n.includes('vida') || n.includes('accidentes') || n.includes('enfermedad') || n.includes('pension') || n.includes('educa') || n.includes('credito')) return L('bolivar', 'sura', 'allianz', 'solidaria');
  if (n.includes('cyber') || n.includes('digital')) return L('chubb', 'zurich', 'axa', 'allianz', 'sura');
  if (n.includes('transporte')) return L('zurich', 'sura', 'allianz', 'mapfre', 'estado', 'mundial', 'bolivar');
  if (n.includes('cumplimiento') || n.includes('cauciones') || n.includes('garant') || n.includes('manejo') || n.includes('fraude')) return L('sbs', 'estado', 'chubb', 'zurich', 'mundial');
  if (n.includes('resp') || n.includes('civil') || n.includes('d&o') || n.includes('directiv') || n.includes('legal')) return L('chubb', 'zurich', 'allianz', 'sbs', 'sura', 'mundial');
  if (n.includes('mascota')) return L('sura', 'mapfre');
  if (n.includes('bici')) return L('sura', 'mapfre', 'allianz');
  return L('sura', 'allianz', 'axa', 'chubb', 'zurich', 'hdi', 'sbs', 'mapfre', 'mundial');
}

export function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'y').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// cat: 'personas' | 'empresas' | 'patrimoniales'
const P = (cat, t, intro, coberturas, ideal, nota) => ({ cat, t, intro, coberturas, ideal, nota });

const LIST = [
  // ---- PERSONAS ----
  P('personas', 'Auto', 'Protege tu vehículo y tu tranquilidad ante daños, pérdida total, hurto y la responsabilidad frente a terceros, con asistencia 24/7 y opciones de vehículo de reemplazo.',
    ['Pérdida total y parcial por daños o accidente', 'Hurto total y parcial', 'Responsabilidad civil frente a terceros', 'Asistencia en vía y grúa 24/7', 'Conductor elegido y vehículo de reemplazo (según plan)'],
    ['Propietarios de vehículo particular', 'Quienes usan el carro a diario o para trabajar'],
    'La prima depende del modelo, uso, ciudad y perfil del conductor.'),
  P('personas', 'Moto', 'Cobertura pensada para motociclistas: protege tu moto y responde por los daños que puedas causar a terceros, con asistencias en vía.',
    ['Daños y pérdida total de la moto', 'Hurto', 'Responsabilidad civil frente a terceros', 'Asistencia en vía y accidentes personales del conductor'],
    ['Motociclistas particulares', 'Domiciliarios y trabajadores en moto'],
    null),
  P('personas', 'SOAT', 'El Seguro Obligatorio de Accidentes de Tránsito que todo vehículo debe tener para circular. Lo expedimos de forma ágil y te recordamos su renovación.',
    ['Gastos médicos por accidente de tránsito', 'Incapacidad permanente', 'Muerte y gastos funerarios', 'Transporte y movilización de víctimas'],
    ['Todo vehículo que circule en Colombia'],
    'El SOAT es de cobertura y tarifa reguladas por el Estado.'),
  P('personas', 'Hogar', 'Protege tu vivienda y todo lo que hay dentro frente a incendio, daños, desastres naturales y hurto, con asistencias para el día a día.',
    ['Incendio, explosión y daños a la estructura', 'Terremoto y eventos de la naturaleza', 'Hurto de contenidos', 'Responsabilidad civil familiar', 'Asistencia plomería, cerrajería y electricidad'],
    ['Propietarios y arrendatarios', 'Familias que quieren proteger su patrimonio'],
    null),
  P('personas', 'Arrendamiento', 'Asegura el pago del canon de arrendamiento y protege la propiedad, dándote tranquilidad como propietario o inmobiliaria.',
    ['Garantía del pago del canon', 'Servicios públicos y administración', 'Daños al inmueble', 'Acompañamiento jurídico en restitución'],
    ['Propietarios que arriendan', 'Inmobiliarias'],
    null),
  P('personas', 'Salud', 'Planes de salud y medicina prepagada para acceder a atención ágil, médicos de tu preferencia y servicios complementarios a tu EPS.',
    ['Atención médica y especialistas', 'Hospitalización y cirugía', 'Exámenes y diagnóstico', 'Coberturas complementarias a la EPS'],
    ['Personas y familias', 'Quienes buscan atención más ágil y de calidad'],
    'Incluye planes complementarios Sura, PAC Nueva EPS y medicina prepagada según disponibilidad.'),
  P('personas', 'Vida individual', 'Un respaldo económico para ti y tu familia ante imprevistos, asegurando su estabilidad y tus proyectos a futuro.',
    ['Indemnización por fallecimiento', 'Incapacidad total y permanente', 'Enfermedades graves (según plan)', 'Auxilios y rentas opcionales'],
    ['Personas con dependientes económicos', 'Quienes tienen créditos o metas a largo plazo'],
    null),
  P('personas', 'Accidentes personales', 'Indemnización ante accidentes que generen lesiones, incapacidad o gastos médicos, con cobertura las 24 horas.',
    ['Muerte accidental', 'Incapacidad por accidente', 'Gastos médicos por accidente', 'Renta diaria por hospitalización'],
    ['Personas activas', 'Trabajadores independientes'],
    null),
  P('personas', 'Exequias', 'Cubre los gastos funerarios de tu familia para que, en un momento difícil, no tengas además una carga económica.',
    ['Servicio funerario completo', 'Cobertura para el grupo familiar', 'Asistencias complementarias', 'Sin exámenes médicos para ingreso'],
    ['Familias', 'Personas que quieren proteger a sus seres queridos'],
    null),
  P('personas', 'Viajes y asistencia', 'Asistencia médica y cobertura durante tus viajes nacionales e internacionales, para que solo te ocupes de disfrutar.',
    ['Asistencia médica por enfermedad o accidente', 'Pérdida o demora de equipaje', 'Cancelación de viaje', 'Asistencia 24/7 en el mundo'],
    ['Viajeros nacionales e internacionales', 'Estudiantes y nómadas'],
    null),
  P('personas', 'Mascotas', 'Cuida la salud de tu mascota con coberturas veterinarias y responsabilidad civil por los daños que pueda causar.',
    ['Consultas y urgencias veterinarias', 'Cirugías y hospitalización', 'Responsabilidad civil del propietario', 'Asistencias para tu mascota'],
    ['Dueños de perros y gatos'],
    null),
  P('personas', 'Bicicletas', 'Protege tu bicicleta ante hurto y daños, e incluye coberturas para el ciclista.',
    ['Hurto de la bicicleta', 'Daños accidentales', 'Accidentes personales del ciclista', 'Responsabilidad civil'],
    ['Ciclistas urbanos y deportivos'],
    null),
  P('personas', 'Plan crédito protegido', 'Asegura el pago de tus créditos ante imprevistos como incapacidad o fallecimiento, protegiendo a tu familia de esa deuda.',
    ['Saldo del crédito por fallecimiento', 'Incapacidad total y permanente', 'Alivio de cuotas (según plan)'],
    ['Personas con créditos vigentes'],
    null),
  P('personas', 'Enfermedades graves', 'Un capital que recibes al diagnóstico de una enfermedad grave cubierta, para afrontar tratamientos y gastos sin descapitalizarte.',
    ['Pago único al diagnóstico', 'Cobertura de enfermedades graves definidas', 'Libre destinación del dinero'],
    ['Personas que quieren respaldo ante diagnósticos costosos'],
    null),
  P('personas', 'Pensión', 'Planes de ahorro e inversión para construir la pensión o el capital que quieres para tu futuro.',
    ['Ahorro programado', 'Rentabilidad según el plan', 'Flexibilidad de aportes', 'Beneficios tributarios'],
    ['Personas que planean su retiro'],
    'Producto de ahorro/inversión sujeto a condiciones de la entidad.'),
  P('personas', 'Educación', 'Asegura los recursos para la educación de tus hijos, sin importar los imprevistos.',
    ['Ahorro para educación', 'Continuidad ante fallecimiento del tomador', 'Flexibilidad de aportes'],
    ['Padres y madres de familia'],
    null),

  // ---- EMPRESAS ----
  P('empresas', 'Todo riesgo empresarial', 'Protección integral de los activos y la operación de tu empresa frente a múltiples riesgos en una sola póliza.',
    ['Incendio, daños y eventos de la naturaleza', 'Sustracción y hurto', 'Equipo y maquinaria', 'Lucro cesante', 'Responsabilidad civil'],
    ['Empresas de cualquier sector', 'Negocios con activos e inventario'],
    null),
  P('empresas', 'Pyme', 'Una cobertura empaquetada, accesible y fácil de entender, diseñada para las necesidades de pequeñas y medianas empresas.',
    ['Daños a bienes e instalaciones', 'Hurto de contenidos', 'Responsabilidad civil', 'Asistencias para el negocio'],
    ['Pequeñas y medianas empresas', 'Locales comerciales y oficinas'],
    null),
  P('empresas', 'Seguros colectivos de salud', 'Planes de salud para tu equipo de trabajo, un beneficio que cuida a tus colaboradores y mejora la retención.',
    ['Atención médica y especialistas', 'Hospitalización y cirugía', 'Cobertura para el grupo familiar (opcional)'],
    ['Empresas que cuidan a su talento'],
    null),
  P('empresas', 'Transporte de mercancías', 'Protege tu carga durante su transporte terrestre, marítimo o aéreo, ante daños, pérdida y hurto.',
    ['Daños y pérdida de la mercancía', 'Hurto durante el transporte', 'Cobertura nacional e internacional', 'Despachos puntuales o por póliza automática'],
    ['Empresas de logística, comercio e industria'],
    null),
  P('empresas', 'Fraude', 'Cubre las pérdidas económicas por apropiación indebida de dinero o bienes, dentro y fuera de tu empresa.',
    ['Hurto y hurto calificado', 'Falsedad, estafa y abuso de confianza', 'Pérdidas causadas por empleados no identificados', 'Bienes de terceros bajo tu cuidado'],
    ['Empresas con manejo de dinero, valores o inventario'],
    null),
  P('empresas', 'Clínicas, hospitales y profesionales de la salud', 'Cobertura especializada de responsabilidad civil para instituciones y profesionales del sector salud.',
    ['Responsabilidad civil profesional médica', 'Responsabilidad civil de la institución', 'Defensa jurídica', 'Cobertura por reclamaciones de pacientes'],
    ['Clínicas y hospitales', 'Médicos y profesionales de la salud'],
    null),
  P('empresas', 'Cumplimiento', 'Las pólizas de cumplimiento posibilitan el desarrollo de proyectos y protegen a la empresa, al cliente y a los contratos pactados.',
    ['Seriedad de la oferta', 'Cumplimiento del contrato', 'Buen manejo del anticipo', 'Calidad del servicio y estabilidad de obra', 'Pago de salarios y prestaciones'],
    ['Contratistas con el Estado o privados', 'Empresas que participan en licitaciones'],
    null),
  P('empresas', 'Directivos y administradores', 'El seguro D&O protege el patrimonio de directivos y administradores frente a reclamaciones derivadas de sus decisiones de gestión.',
    ['Defensa jurídica de directivos', 'Indemnizaciones por reclamaciones', 'Costos de investigación', 'Cobertura para la empresa (según condiciones)'],
    ['Juntas directivas', 'Gerentes y administradores'],
    null),
  P('empresas', 'Protección legal', 'Acompañamiento y respaldo jurídico para tu empresa ante conflictos y procesos legales.',
    ['Asesoría jurídica', 'Costos de defensa legal', 'Acompañamiento en procesos', 'Honorarios de abogados'],
    ['Empresas que quieren respaldo jurídico'],
    null),
  P('empresas', 'Protección digital', 'El seguro de protección digital (cyber) cuida a tu empresa frente a ciberataques, fraude electrónico y pérdida de datos.',
    ['Respuesta a incidentes y recuperación', 'Pérdida y restauración de datos', 'Fraude electrónico', 'Responsabilidad por filtración de información', 'Interrupción del negocio'],
    ['Empresas con operación e información digital'],
    null),

  // ---- PATRIMONIALES ----
  P('patrimoniales', 'Responsabilidad civil', 'Te protege ante reclamaciones de terceros por daños que puedas causar en el desarrollo de tu actividad.',
    ['Daños a terceros (personas y bienes)', 'Gastos de defensa', 'Cobertura contractual y extracontractual', 'Predios, labores y operaciones'],
    ['Empresas y profesionales', 'Personas con exposición a terceros'],
    null),
  P('patrimoniales', 'Cyber', 'Gestión integral de riesgos digitales: protege tu información, tu operación y tu reputación ante ciberataques.',
    ['Respuesta a incidentes', 'Recuperación de datos y sistemas', 'Responsabilidad por filtración de datos', 'Extorsión cibernética'],
    ['Empresas de cualquier tamaño con presencia digital'],
    null),
  P('patrimoniales', 'Transporte', 'Cobertura de mercancías y valores mientras están en tránsito, por cualquier medio de transporte.',
    ['Daños y pérdida de la mercancía', 'Hurto en tránsito', 'Carga nacional e internacional'],
    ['Empresas de logística y comercio'],
    null),
  P('patrimoniales', 'Todo riesgo construcción', 'Protege tu proyecto de construcción o montaje durante toda su ejecución, ante daños y responsabilidad frente a terceros.',
    ['Daños a la obra', 'Eventos de la naturaleza', 'Responsabilidad civil', 'Maquinaria y equipos de obra'],
    ['Constructoras y contratistas de obra'],
    null),
  P('patrimoniales', 'Cauciones y garantías', 'Pólizas de garantía que respaldan el cumplimiento de tus obligaciones contractuales según cada contrato.',
    ['Garantías para contratos públicos y privados', 'Seriedad de la oferta', 'Cumplimiento y anticipo', 'Estabilidad de obra'],
    ['Contratistas y proveedores'],
    null),
];

export const PRODUCTOS = LIST.map(p => ({ ...p, slug: slugify(p.t), logos: companiesFor(p.t) }));

// ---------- Comparativo por producto ----------
const COMPANY_NAMES = {
  sura: 'SURA', arlsura: 'ARL SURA', bolivar: 'Bolívar', allianz: 'Allianz', axa: 'AXA Colpatria',
  hdi: 'HDI', sbs: 'SBS', solidaria: 'Solidaria', emi: 'EMI', assist: 'Assist Card', mapfre: 'Mapfre',
  chubb: 'Chubb', zurich: 'Zurich', estado: 'S. del Estado', qualitas: 'Quálitas', mundial: 'Mundial',
};

export function companyKeysFor(raw) {
  const n = (raw || '').toLowerCase();
  if (n.includes('soat')) return ['sura', 'axa', 'mapfre', 'solidaria', 'estado'];
  if (n.includes('moto') || n.includes('auto')) return ['sura', 'allianz', 'axa', 'hdi', 'mapfre', 'qualitas', 'solidaria', 'mundial'];
  if (n.includes('hogar')) return ['mapfre', 'bolivar', 'sura', 'allianz', 'solidaria', 'mundial'];
  if (n.includes('arrend')) return ['bolivar', 'sura', 'solidaria'];
  if (n.includes('viaje')) return ['assist', 'sura'];
  if (n.includes('salud') || n.includes('emi') || n.includes('eps')) return ['sura', 'axa', 'emi', 'bolivar', 'allianz'];
  if (n.includes('exequias')) return ['bolivar', 'solidaria'];
  if (n.includes('vida') || n.includes('accidentes') || n.includes('enfermedad') || n.includes('pension') || n.includes('educa') || n.includes('credito')) return ['bolivar', 'sura', 'allianz', 'solidaria'];
  if (n.includes('cyber') || n.includes('digital')) return ['chubb', 'zurich', 'axa', 'allianz', 'sura'];
  if (n.includes('transporte')) return ['zurich', 'sura', 'allianz', 'mapfre', 'estado', 'mundial', 'bolivar'];
  if (n.includes('cumplimiento') || n.includes('cauciones') || n.includes('garant') || n.includes('manejo') || n.includes('fraude')) return ['estado', 'mundial', 'chubb', 'zurich', 'sbs'];
  if (n.includes('resp') || n.includes('civil') || n.includes('d&o') || n.includes('directiv') || n.includes('legal') || n.includes('clinic')) return ['chubb', 'zurich', 'allianz', 'sbs', 'sura'];
  if (n.includes('mascota')) return ['sura', 'mapfre'];
  if (n.includes('bici')) return ['sura', 'mapfre', 'allianz'];
  return ['sura', 'allianz', 'axa', 'chubb', 'zurich', 'hdi', 'sbs', 'mapfre', 'mundial'];
}

// Matrices exactas del Comparativo Vera Seguros (jun-2026). S=incluida, P=opcional/parcial/verificar, N=no disponible.
const DETAIL = {
  'auto': { order: ['sura', 'allianz', 'axa', 'hdi', 'mapfre', 'qualitas', 'solidaria', 'mundial'], rows: [
    ['Daños al vehículo (total/parcial)', { sura: 'S', allianz: 'S', axa: 'S', hdi: 'S', mapfre: 'S', qualitas: 'S', solidaria: 'S', mundial: 'S' }],
    ['Hurto total y parcial', { sura: 'S', allianz: 'S', axa: 'S', hdi: 'S', mapfre: 'S', qualitas: 'S', solidaria: 'S', mundial: 'S' }],
    ['Responsabilidad civil a terceros', { sura: 'S', allianz: 'S', axa: 'S', hdi: 'S', mapfre: 'S', qualitas: 'S', solidaria: 'S', mundial: 'S' }],
    ['Deducible 0% en pérdida total', { sura: 'P', allianz: 'S', axa: 'S', hdi: 'S', mapfre: 'P', qualitas: 'P', solidaria: 'P', mundial: 'P' }],
    ['Carro de reemplazo', { sura: 'S', allianz: 'S', axa: 'P', hdi: 'S', mapfre: 'S', qualitas: 'S', solidaria: 'P', mundial: 'P' }],
    ['Grúa y asistencia en vía', { sura: 'S', allianz: 'S', axa: 'S', hdi: 'S', mapfre: 'S', qualitas: 'S', solidaria: 'S', mundial: 'S' }],
  ]},
  'hogar': { order: ['mapfre', 'bolivar', 'sura', 'allianz', 'solidaria', 'mundial'], rows: [
    ['Incendio y rayo', { mapfre: 'S', bolivar: 'S', sura: 'S', allianz: 'S', solidaria: 'S', mundial: 'S' }],
    ['Terremoto y naturaleza', { mapfre: 'S', bolivar: 'S', sura: 'P', allianz: 'S', solidaria: 'S', mundial: 'S' }],
    ['Daños por agua', { mapfre: 'S', bolivar: 'S', sura: 'S', allianz: 'S', solidaria: 'P', mundial: 'P' }],
    ['Hurto de contenido', { mapfre: 'S', bolivar: 'P', sura: 'P', allianz: 'S', solidaria: 'P', mundial: 'S' }],
    ['RC familiar', { mapfre: 'S', bolivar: 'S', sura: 'S', allianz: 'S', solidaria: 'S', mundial: 'S' }],
    ['Asistencia hogar', { mapfre: 'S', bolivar: 'S', sura: 'P', allianz: 'S', solidaria: 'P', mundial: 'P' }],
    ['Equipos electrónicos', { mapfre: 'S', bolivar: 'P', sura: 'P', allianz: 'S', solidaria: 'P', mundial: 'S' }],
  ]},
  'salud': { order: ['sura', 'axa', 'emi', 'bolivar', 'allianz'], rows: [
    ['Consultas y especialistas', { sura: 'S', axa: 'S', emi: 'P', bolivar: 'S', allianz: 'S' }],
    ['Hospitalización y cirugía', { sura: 'S', axa: 'S', emi: 'N', bolivar: 'S', allianz: 'S' }],
    ['Urgencias', { sura: 'S', axa: 'S', emi: 'S', bolivar: 'S', allianz: 'S' }],
    ['Atención médica en casa 24/7', { sura: 'P', axa: 'P', emi: 'S', bolivar: 'S', allianz: 'S' }],
    ['Maternidad', { sura: 'S', axa: 'S', emi: 'N', bolivar: 'S', allianz: 'S' }],
  ]},
  'vida-individual': { order: ['bolivar', 'sura', 'allianz', 'solidaria'], rows: [
    ['Muerte por cualquier causa', { bolivar: 'S', sura: 'S', allianz: 'S', solidaria: 'S' }],
    ['Incapacidad total y permanente', { bolivar: 'S', sura: 'S', allianz: 'S', solidaria: 'S' }],
    ['Enfermedades graves', { bolivar: 'S', sura: 'S', allianz: 'S', solidaria: 'S' }],
    ['Muerte accidental', { bolivar: 'S', sura: 'S', allianz: 'S', solidaria: 'S' }],
    ['Auxilio funerario', { bolivar: 'S', sura: 'S', allianz: 'P', solidaria: 'S' }],
  ]},
};

// Compañías recomendadas por Vera para cada producto (del resumen del comparativo).
const RECOM = {
  'auto': ['sura', 'axa', 'hdi'], 'moto': ['sura', 'allianz'], 'soat': ['solidaria', 'estado'],
  'hogar': ['mapfre', 'bolivar'], 'arrendamiento': ['bolivar', 'sura'], 'salud': ['sura', 'emi'],
  'vida-individual': ['bolivar', 'sura'], 'accidentes-personales': ['sura', 'bolivar'], 'exequias': ['bolivar'],
  'viajes-y-asistencia': ['assist'], 'mascotas': ['sura'], 'bicicletas': ['sura'],
  'plan-credito-protegido': ['bolivar', 'sura'], 'enfermedades-graves': ['bolivar', 'sura'], 'pension': ['sura', 'bolivar'], 'educacion': ['bolivar', 'sura'],
  'todo-riesgo-empresarial': ['chubb', 'sura', 'allianz'], 'pyme': ['mapfre', 'sura'], 'seguros-colectivos-de-salud': ['sura'],
  'transporte-de-mercancias': ['zurich', 'mundial'], 'fraude': ['chubb', 'sbs'],
  'clinicas-hospitales-y-profesionales-de-la-salud': ['chubb', 'sura'], 'cumplimiento': ['estado', 'mundial'],
  'directivos-y-administradores': ['chubb'], 'proteccion-legal': ['chubb'], 'proteccion-digital': ['chubb', 'zurich'],
  'responsabilidad-civil': ['chubb'], 'cyber': ['chubb', 'zurich'], 'transporte': ['zurich', 'mundial'],
  'todo-riesgo-construccion': ['allianz', 'zurich'], 'cauciones-y-garantias': ['estado', 'mundial'],
};

const STATUS = {
  S: { glyph: '✓', color: '#218166', bg: '#d2eae8' },
  P: { glyph: '–', color: '#C98A00', bg: '#FBF2DC' },
  N: { glyph: '✕', color: '#B23B4E', bg: '#F6E7EA' },
};

function buildComparativo(p) {
  const det = DETAIL[p.slug];
  const keys = det ? det.order : companyKeysFor(p.t);
  const rec = RECOM[p.slug] || [keys[0]];
  const companias = keys.map(k => ({ key: k, name: COMPANY_NAMES[k] || k, logo: LOGOS[k], recom: rec.includes(k) }));
  const cell = (s) => { const st = STATUS[s] || STATUS.P; return { status: s, ...st }; };
  let rows;
  if (det) {
    rows = det.rows.map(([label, map]) => ({ label, cells: keys.map(k => cell(map[k] || 'P')) }));
  } else {
    rows = (p.coberturas || []).slice(0, 6).map(label => ({ label, cells: keys.map(() => cell('S')) }));
  }
  return { companias, rows, gridCols: '200px repeat(' + keys.length + ', minmax(64px, 1fr))', minWidth: (200 + keys.length * 72) + 'px' };
}

PRODUCTOS.forEach(p => { p.comparativo = buildComparativo(p); });

export function findProducto(slug) {
  return PRODUCTOS.find(p => p.slug === slug) || null;
}
