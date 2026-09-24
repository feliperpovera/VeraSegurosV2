// SEO por página de producto: título, descripción, H1, frase inicial y preguntas frecuentes.
// Keywords: autocompletar de Google Colombia + Search Console (sep-2026). Local (Medellín) primero:
// ahí el sitio ya rankea en posiciones 8-22, contra 40-50 en búsquedas nacionales.
// Reglas: sin precios ni cifras inventadas; respuestas cortas (el sitio quiere poco texto);
// solo normas verificadas en fuente oficial. Revisar si cambia un producto.
export const SEO = {
  // Salud: la página pilar. Sus preguntas frecuentes viven en SALUD_FAQ (build-seo.mjs).
  "salud": {
    "kw_principal": "seguros de salud y medicina prepagada",
    "kw_secundarias": [
      "seguro de salud precios",
      "medicina prepagada precios",
      "póliza de salud sura precios",
      "medicina prepagada medellín",
      "seguro de salud colombia"
    ],
    "title": "Seguros de salud y medicina prepagada: precios 2026",
    "description": "Compara seguros de salud y medicina prepagada en Colombia: precios 2026 por edad de SURA, Coomeva, Bolívar, Allianz, AXA Colpatria, MAPFRE y Mundial.",
    "h1": "Seguros de salud y medicina prepagada en Colombia",
    "intro": "Compara SURA, Coomeva, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE y Seguros Mundial, con precios por edad y asesoría gratis."
  },
  "auto": {
    "kw_principal": "seguro todo riesgo para carro",
    "kw_secundarias": [
      "seguro todo riesgo carro",
      "seguro de carro",
      "seguro todo riesgo carro precio",
      "seguro para carro medellin",
      "seguro todo riesgo carro que cubre",
      "cuanto cuesta seguro de carro en colombia"
    ],
    "title": "Seguro todo riesgo para carro en Medellín | Vera Seguros",
    "description": "Seguro todo riesgo para carro en Medellín y Colombia: daños, hurto, responsabilidad civil y grúa, según el plan. Compara y cotiza con asesoría sin costo.",
    "h1": "Seguro todo riesgo para carro en Medellín y Colombia",
    "intro": "Compara el seguro todo riesgo para carro de varias aseguradoras y elige la cobertura que se ajusta a tu vehículo y presupuesto.",
    "faq": [
      {
        "q": "¿Qué cubre el seguro todo riesgo para carro?",
        "a": "Según el plan, puede cubrir daños y pérdida total o parcial de tu carro, hurto, responsabilidad civil frente a terceros y asistencia en vía con grúa 24/7. Es voluntario y no reemplaza al SOAT, que es obligatorio."
      },
      {
        "q": "¿Cuánto cuesta un seguro de carro en Colombia?",
        "a": "Depende del modelo y el valor del carro, su uso, la ciudad donde circula y tu perfil como conductor, además del deducible y las coberturas que elijas. Te cotizamos sin costo con varias aseguradoras para que compares."
      },
      {
        "q": "¿Qué necesito para asegurar mi carro?",
        "a": "La placa, tus datos y los del conductor habitual. Declara el uso real: si trabajas con el carro en plataformas, no todas las pólizas lo aceptan. Según la aseguradora, pueden pedir una inspección antes de expedir la póliza."
      },
      {
        "q": "¿Dónde cotizar un seguro de carro en Medellín?",
        "a": "Con Vera Seguros, agencia con sede en Medellín y más de 20 años de experiencia. Comparamos SURA, Bolívar, Allianz, AXA Colpatria, HDI, Mapfre y otras, y te acompañamos en todo el proceso. La asesoría no tiene costo."
      },
      {
        "q": "¿Qué seguro todo riesgo para carro me conviene?",
        "a": "Depende de tu carro y de lo que priorices: deducible, carro de reemplazo, asistencias o precio. Cada aseguradora tiene condiciones distintas; por eso comparamos varias y te explicamos las diferencias antes de que decidas."
      }
    ]
  },
  "moto": {
    "kw_principal": "seguro todo riesgo para moto",
    "kw_secundarias": [
      "seguro todo riesgo moto",
      "seguro de moto",
      "seguro para motos",
      "seguro todo riesgo moto precio",
      "seguro todo riesgo moto medellin",
      "seguro todo riesgo moto que cubre"
    ],
    "title": "Seguro todo riesgo para moto en Medellín | Vera Seguros",
    "description": "Seguro todo riesgo para moto en Medellín y Colombia: daños, hurto, responsabilidad civil y asistencia en vía, según el plan. Compara y cotiza sin costo.",
    "h1": "Seguro todo riesgo para moto en Medellín y Colombia",
    "intro": "Un seguro todo riesgo para moto protege tu moto ante daños y hurto, y cubre daños a terceros, según el plan.",
    "faq": [
      {
        "q": "¿Qué cubre el seguro todo riesgo para moto?",
        "a": "Según el plan, puede cubrir daños y pérdida total de tu moto, hurto, responsabilidad civil frente a terceros, asistencia en vía y accidentes personales del conductor. Revisa deducibles y exclusiones de cada póliza antes de elegir."
      },
      {
        "q": "¿Cuánto cuesta un seguro todo riesgo para moto?",
        "a": "Depende de la referencia, el cilindraje y el valor de la moto, el uso que le das, la ciudad y tu perfil como conductor, además del deducible que elijas. Te cotizamos sin costo con varias aseguradoras."
      },
      {
        "q": "¿Qué necesito para asegurar mi moto?",
        "a": "La placa, tus datos y el uso de la moto: particular, domicilios u otro trabajo. Cada aseguradora define qué usos acepta y puede pedir una inspección antes de expedir la póliza."
      },
      {
        "q": "¿Dónde cotizar un seguro para moto en Medellín?",
        "a": "Con Vera Seguros, agencia en Medellín: comparamos SURA, Bolívar, Allianz, AXA Colpatria, HDI, Mapfre y otras para motos particulares y de trabajo. Te asesoramos sin costo por WhatsApp y te acompañamos en todo el proceso."
      },
      {
        "q": "Si tengo SOAT, ¿necesito un seguro todo riesgo para moto?",
        "a": "El SOAT es obligatorio y cubre a las personas lesionadas en un accidente de tránsito. No cubre daños ni hurto de tu moto, ni daños a bienes de terceros; para eso está el todo riesgo, que es voluntario."
      }
    ]
  },
  "soat": {
    "kw_principal": "soat",
    "kw_secundarias": [
      "comprar soat",
      "soat para moto",
      "soat para carro",
      "soat medellin",
      "comprar soat medellin",
      "soat que cubre"
    ],
    "title": "SOAT para carro y moto: cómpralo en Medellín | Vera Seguros",
    "description": "Compra o renueva el SOAT de tu carro o moto en Medellín y toda Colombia: expedición ágil, recordatorio de renovación y asesoría sin costo. Escríbenos.",
    "h1": "Compra o renueva tu SOAT en Medellín",
    "intro": "El SOAT es obligatorio para circular en Colombia (Ley 769 de 2002): cómpralo o renuévalo con nosotros para tu carro o moto.",
    "faq": [
      {
        "q": "¿Qué cubre el SOAT?",
        "a": "Cubre a todas las personas lesionadas en un accidente de tránsito (conductor, ocupantes, pasajeros y peatones): gastos médicos, incapacidad permanente, muerte y gastos funerarios, y transporte de víctimas. No cubre daños a vehículos ni a otros bienes."
      },
      {
        "q": "¿Cuánto cuesta el SOAT para carro o moto?",
        "a": "Depende de la categoría del vehículo, que se define por su tipo, cilindraje, antigüedad y capacidad de pasajeros. La Superintendencia Financiera fija cada año las tarifas máximas. Te confirmamos el valor exacto con tu placa, sin costo de asesoría."
      },
      {
        "q": "¿Qué aseguradora elegir para el SOAT de mi moto o carro?",
        "a": "Las coberturas del SOAT las fija la ley y son iguales en todas las aseguradoras autorizadas. Por eso conviene elegir por servicio: que te lo expidan rápido y te recuerden renovarlo a tiempo."
      },
      {
        "q": "¿Qué necesito para comprar o renovar el SOAT?",
        "a": "La placa y los datos de quien lo compra. Ten a mano la licencia de tránsito (tarjeta de propiedad): ahí están el tipo, el cilindraje, el modelo y la capacidad del vehículo, que definen su categoría."
      },
      {
        "q": "¿Dónde comprar el SOAT en Medellín?",
        "a": "Con Vera Seguros, agencia en Medellín: te lo expedimos para carro o moto con aseguradoras autorizadas como SURA, AXA Colpatria, HDI, Mapfre, Mundial, Solidaria o Seguros del Estado, y te recordamos la renovación. Escríbenos por WhatsApp."
      }
    ]
  },
  "bicicletas": {
    "kw_principal": "seguro para bicicletas",
    "kw_secundarias": [
      "seguro para bicicleta eléctrica",
      "seguro de bicicleta",
      "seguro para bicicleta colombia",
      "seguro para bicicleta precio",
      "seguro de bicicleta que cubre",
      "requisitos para seguro de bicicleta"
    ],
    "title": "Seguro para bicicletas, incluso eléctricas | Vera Seguros",
    "description": "Seguro para bicicletas en Colombia, también eléctricas: hurto, daños y accidentes del ciclista, según el plan. Compara y cotiza con asesoría sin costo.",
    "h1": "Seguro para bicicletas convencionales y eléctricas",
    "intro": "Un seguro para bicicletas puede cubrir el hurto y los daños de tu bici, los accidentes del ciclista y la responsabilidad civil.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro para bicicletas?",
        "a": "Según el plan, puede cubrir el hurto de la bicicleta, daños accidentales, accidentes personales del ciclista y responsabilidad civil por daños a terceros. Algunas coberturas son opcionales, así que revisa qué incluye cada póliza."
      },
      {
        "q": "¿Cuánto cuesta un seguro para bicicleta?",
        "a": "Depende del valor y el tipo de bicicleta (ruta, montaña, urbana o eléctrica), la ciudad donde la usas y las coberturas que elijas. Te cotizamos sin costo con varias aseguradoras."
      },
      {
        "q": "¿Puedo asegurar una bicicleta eléctrica?",
        "a": "Sí. Algunas aseguradoras las aceptan; SURA, por ejemplo, asegura bicicletas eléctricas siempre que por norma no requieran SOAT ni matrícula. Cuéntanos el modelo y te decimos qué opciones la cubren."
      },
      {
        "q": "¿Qué necesito para asegurar mi bicicleta?",
        "a": "Los datos de la bicicleta (marca, tipo y valor) y tus datos personales. Según la aseguradora, pueden pedirte una inspección virtual antes de expedir la póliza."
      },
      {
        "q": "¿Qué aseguradoras tienen seguro para bicicletas en Colombia?",
        "a": "Comparamos las opciones de SURA, Bolívar, Allianz, Mapfre y SBS, y te explicamos sus diferencias en coberturas y condiciones. Somos agencia en Medellín y asesoramos sin costo en toda Colombia."
      }
    ]
  },
  "hogar": {
    "kw_principal": "seguro de hogar",
    "kw_secundarias": [
      "seguro para casa",
      "seguro de vivienda",
      "seguro de hogar precios colombia",
      "seguro de hogar que cubre",
      "seguro de vivienda medellin",
      "seguro de hogar para arrendatarios"
    ],
    "title": "Seguro de hogar en Medellín y Colombia | Vera Seguros",
    "description": "Seguro de hogar para casa o apartamento en Medellín y Colombia: incendio, terremoto y hurto, según la póliza. Compara y cotiza con asesoría sin costo.",
    "h1": "Seguro de hogar para tu casa o apartamento",
    "intro": "El seguro de hogar protege tu vivienda y tus cosas ante incendio, terremoto, daños por agua o hurto, según la póliza.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro de hogar?",
        "a": "Según la póliza, puede cubrir la estructura y los contenidos ante incendio, terremoto y otros eventos de la naturaleza, daños por agua y hurto, además de responsabilidad civil familiar y asistencias de plomería, cerrajería y electricidad."
      },
      {
        "q": "¿Cuánto cuesta un seguro de hogar en Colombia?",
        "a": "Depende del valor asegurado de la construcción y de tus contenidos, el tipo de inmueble, su ubicación y las coberturas que elijas. Te cotizamos sin costo con varias aseguradoras para que compares."
      },
      {
        "q": "¿Qué necesito para asegurar mi casa o apartamento?",
        "a": "La dirección, el tipo de inmueble y el valor de la construcción y de tus contenidos. Si vives en arriendo, puedes asegurar solo tus contenidos y tu responsabilidad civil, según la póliza."
      },
      {
        "q": "¿Dónde cotizar un seguro de vivienda en Medellín?",
        "a": "Con Vera Seguros, agencia en Medellín: comparamos SURA, Bolívar, Allianz, AXA Colpatria, Mapfre y otras para casas y apartamentos del Valle de Aburrá y del resto de Colombia. La asesoría no tiene costo."
      },
      {
        "q": "¿El seguro de hogar cubre electrodomésticos?",
        "a": "Puede cubrirlos. Algunas pólizas incluyen daños a equipos eléctricos y electrónicos, a veces como cobertura adicional. Revisa el valor asegurado y el deducible de esa cobertura antes de contratar."
      }
    ]
  },
  "arrendamiento": {
    "kw_principal": "seguro de arrendamiento",
    "kw_secundarias": [
      "poliza de arrendamiento",
      "seguro de arriendo",
      "póliza de arrendamiento precio colombia",
      "seguro de arrendamiento medellin",
      "seguro de arrendamiento que cubre",
      "como funciona el seguro de arriendo en colombia"
    ],
    "title": "Seguro de arrendamiento en Medellín | Vera Seguros",
    "description": "Seguro de arrendamiento en Medellín y Colombia: respalda el pago del canon, servicios y daños al inmueble, según la póliza. Compara y cotiza sin costo.",
    "h1": "Seguro de arrendamiento para propietarios",
    "intro": "El seguro de arrendamiento respalda a propietarios e inmobiliarias con el pago del canon si el inquilino incumple, según la póliza.",
    "faq": [
      {
        "q": "¿Qué cubre el seguro de arrendamiento?",
        "a": "Según la póliza, puede cubrir el canon que el inquilino deje de pagar, los servicios públicos y la administración, daños al inmueble y acompañamiento jurídico para recuperar el inmueble."
      },
      {
        "q": "¿Cuánto cuesta una póliza de arrendamiento?",
        "a": "Depende del valor del canon (y de la administración, si la incluyes), de las coberturas adicionales que sumes y de la aseguradora. Te cotizamos sin costo con SURA, Bolívar, Mapfre, Mundial y otras."
      },
      {
        "q": "¿Cómo funciona el seguro de arrendamiento?",
        "a": "El propietario o la inmobiliaria toma la póliza y la aseguradora estudia al inquilino. Según la compañía y el plan, basta con sus datos o piden soportes de ingresos y, a veces, codeudor. Si lo aprueba, la póliza respalda el contrato."
      },
      {
        "q": "¿Dónde contratar un seguro de arrendamiento en Medellín?",
        "a": "Con Vera Seguros, agencia en Medellín. Asesoramos a propietarios e inmobiliarias de Medellín y de toda Colombia, comparamos varias aseguradoras y te acompañamos en todo el proceso. La asesoría no tiene costo."
      },
      {
        "q": "¿Qué pasa si el inquilino deja de pagar?",
        "a": "Reportas el incumplimiento dentro del plazo que fije la póliza; nosotros te ayudamos con el trámite. Según sus condiciones, la aseguradora te paga el canon asegurado y te acompaña jurídicamente para recuperar el inmueble."
      }
    ]
  },
  "mascotas": {
    "kw_principal": "seguro para mascotas",
    "kw_secundarias": [
      "seguro para perros",
      "seguro para gatos",
      "seguro para mascotas medellin",
      "seguro para mascotas precio",
      "seguro para mascotas que cubre",
      "seguro medico para mascotas medellin"
    ],
    "title": "Seguro para mascotas en Medellín | Vera Seguros",
    "description": "Seguro para mascotas en Medellín y Colombia: consultas, urgencias y cirugías para tu perro o gato, según el plan. Compara y cotiza con asesoría sin costo.",
    "h1": "Seguro para mascotas: perros y gatos",
    "intro": "Con un seguro para mascotas, tu perro o gato tiene respaldo en consultas, urgencias y cirugías veterinarias, según el plan.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro para mascotas?",
        "a": "Según el plan, puede cubrir consultas y urgencias veterinarias, cirugías y hospitalización, responsabilidad civil por daños que cause tu mascota y asistencias. Revisa las exclusiones y si hay periodos de carencia."
      },
      {
        "q": "¿Cuánto cuesta un seguro para mascotas?",
        "a": "Depende del plan y de las coberturas que elijas; según la aseguradora, también influyen la especie y la edad de tu mascota. Te cotizamos sin costo con varias aseguradoras para que compares."
      },
      {
        "q": "¿Qué requisitos piden para asegurar a mi perro o gato?",
        "a": "Cada aseguradora fija sus condiciones de ingreso, como la edad de la mascota. Con los datos de tu perro o gato (especie, raza y edad) te decimos qué planes lo aceptan."
      },
      {
        "q": "¿Hay seguro para mascotas en Medellín?",
        "a": "Sí. Desde Medellín comparamos los planes de SURA, Bolívar, HDI, Mapfre, Mundial, Solidaria y SBS para perros y gatos, y te asesoramos sin costo por WhatsApp."
      },
      {
        "q": "¿Qué seguro es obligatorio para perros?",
        "a": "La norma exige una póliza de responsabilidad civil extracontractual a los propietarios de perros de manejo especial, antes llamados potencialmente peligrosos (Decreto 380 de 2022). Te ayudamos a cotizar una póliza que cumpla ese requisito."
      }
    ]
  },
  "viajes-y-asistencia": {
    "kw_principal": "seguro de viaje",
    "kw_secundarias": [
      "seguro de viaje internacional",
      "asistencia en viajes",
      "seguro de viaje medellin",
      "seguro de viaje precio",
      "seguro de viaje internacional para colombianos",
      "seguro de viaje que cubre"
    ],
    "title": "Seguro de viaje internacional desde Medellín | Vera Seguros",
    "description": "Seguro de viaje nacional e internacional desde Medellín: asistencia médica, equipaje y cancelación, según el plan. Compara y cotiza con asesoría sin costo.",
    "h1": "Seguro de viaje nacional e internacional",
    "intro": "Un seguro de viaje te da asistencia médica y cobertura de equipaje y cancelación en viajes nacionales e internacionales, según el plan.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro de viaje internacional?",
        "a": "Según el plan, puede cubrir asistencia médica por enfermedad o accidente, pérdida o demora de equipaje, cancelación del viaje y asistencia 24/7 en el destino. Revisa los montos y las exclusiones antes de comprar."
      },
      {
        "q": "¿Cuánto cuesta un seguro de viaje?",
        "a": "Depende del destino, los días de viaje, la edad de cada viajero y los montos de cobertura que elijas. Te cotizamos sin costo con varias aseguradoras para que compares."
      },
      {
        "q": "¿Qué necesito para comprar un seguro de viaje?",
        "a": "Las fechas y el destino, y los datos y la edad de cada viajero. Si vas a Europa u otro destino con requisitos de entrada, revísalos con el consulado y te ayudamos a elegir un plan acorde."
      },
      {
        "q": "¿Dónde comprar un seguro de viaje en Medellín?",
        "a": "Con Vera Seguros, agencia en Medellín: comparamos planes de SURA, Bolívar, Allianz, AXA Colpatria, Zurich, Chubb, SBS y Assist Card, y lo tramitamos por WhatsApp antes de tu viaje. La asesoría no tiene costo."
      },
      {
        "q": "¿El seguro de viaje cubre enfermedades preexistentes?",
        "a": "Depende del plan: algunos atienden urgencias por preexistencias hasta un límite y otros no las incluyen. Cuéntanos tu caso al cotizar y te mostramos qué planes las contemplan."
      }
    ]
  },
  "vida-individual": {
    "kw_principal": "seguro de vida",
    "kw_secundarias": [
      "seguro de vida medellin",
      "seguro de vida colombia",
      "seguro de vida individual",
      "poliza de vida",
      "seguro de vida precio",
      "seguro de vida para adultos mayores"
    ],
    "title": "Seguro de vida en Medellín y Colombia | Vera Seguros",
    "description": "Seguro de vida en Medellín y Colombia: protege a tu familia si faltas. Comparamos SURA, Bolívar, Allianz y más aseguradoras. Cotiza con asesoría sin costo.",
    "h1": "Seguro de vida para proteger a tu familia",
    "intro": "Con un seguro de vida, tu familia recibe un respaldo económico si falleces, para mantener su estabilidad y sus proyectos.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro de vida?",
        "a": "Según la póliza, paga un capital a tus beneficiarios si falleces y puede cubrir incapacidad total y permanente, enfermedades graves, muerte accidental y auxilio funerario. Te mostramos qué incluye cada opción antes de elegir."
      },
      {
        "q": "¿Cuánto cuesta un seguro de vida en Colombia?",
        "a": "Depende de tu edad, tu salud, si fumas, la suma asegurada y las coberturas que elijas. Con esos datos comparamos varias aseguradoras y te entregamos la cotización sin costo."
      },
      {
        "q": "¿Qué requisitos piden para un seguro de vida?",
        "a": "Tu documento de identidad, la solicitud y una declaración de salud. Según tu edad y la suma asegurada, la aseguradora puede pedir exámenes médicos. Te guiamos en cada paso."
      },
      {
        "q": "¿Dónde cotizar un seguro de vida en Medellín?",
        "a": "En Vera Seguros, agencia de Medellín con más de 20 años de experiencia. Comparamos SURA, Bolívar, Allianz, AXA Colpatria, Mapfre y otras, y te asesoramos sin costo por WhatsApp desde cualquier ciudad de Colombia."
      },
      {
        "q": "¿Hay seguro de vida para adultos mayores?",
        "a": "Sí, pero cada aseguradora fija una edad máxima de ingreso y el precio aumenta con la edad. Cuéntanos la edad de la persona a asegurar y te decimos qué opciones tiene."
      }
    ]
  },
  "accidentes-personales": {
    "kw_principal": "seguro de accidentes personales",
    "kw_secundarias": [
      "poliza de accidentes personales",
      "seguro de accidentes personales precio",
      "seguro de accidentes personales que cubre",
      "seguro de accidentes personales colombia",
      "como cobrar seguro de accidentes personales",
      "seguro de accidentes personales para trabajadores"
    ],
    "title": "Seguro de accidentes personales en Medellín | Vera Seguros",
    "description": "Seguro de accidentes personales en Colombia: indemnización por lesiones, incapacidad o gastos médicos, las 24 horas. Cotiza con asesoría sin costo.",
    "h1": "Seguro de accidentes personales las 24 horas",
    "intro": "El seguro de accidentes personales te indemniza si un accidente te causa lesiones, incapacidad o gastos médicos, con cobertura las 24 horas.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro de accidentes personales?",
        "a": "Según la póliza, puede cubrir muerte accidental, incapacidad por accidente, gastos médicos y una renta diaria si te hospitalizan por un accidente. La cobertura es las 24 horas, no solo en tu jornada de trabajo."
      },
      {
        "q": "¿Cuánto cuesta un seguro de accidentes personales?",
        "a": "Depende de la suma asegurada, las coberturas que elijas, tu edad y tu ocupación o actividad. Comparamos SURA, Bolívar, Allianz, Mundial y otras aseguradoras, y te cotizamos sin costo."
      },
      {
        "q": "¿Cómo sacar un seguro de accidentes personales en Colombia?",
        "a": "Escríbenos por WhatsApp con tu edad, tu ocupación y la suma que quieres asegurar. Desde Medellín comparamos opciones para cualquier ciudad del país y te acompañamos en la expedición. La asesoría no tiene costo."
      },
      {
        "q": "¿Es lo mismo que el SOAT o la ARL?",
        "a": "No. El SOAT cubre lesiones en accidentes de tránsito y la ARL, accidentes de trabajo. El seguro de accidentes personales te indemniza por accidentes cubiertos en cualquier momento, según la póliza, y complementa esa protección."
      },
      {
        "q": "¿Cómo cobrar el seguro de accidentes personales?",
        "a": "Avisa a la aseguradora lo antes posible y presenta los soportes que pida según el amparo, como historia clínica, incapacidad o facturas médicas. En Vera te acompañamos en toda la reclamación."
      }
    ]
  },
  "exequias": {
    "kw_principal": "seguro exequial",
    "kw_secundarias": [
      "plan exequial",
      "seguro exequial medellin",
      "plan exequial medellin",
      "seguro funerario",
      "seguro exequial que cubre",
      "cuanto cuesta un seguro exequial en colombia"
    ],
    "title": "Seguro exequial y plan exequial en Medellín | Vera Seguros",
    "description": "Seguro exequial en Medellín y Colombia: servicio funerario completo para tu familia. Comparamos aseguradoras. Cotiza con asesoría sin costo.",
    "h1": "Seguro exequial para ti y tu familia",
    "intro": "Con un seguro exequial, el servicio funerario de tu familia queda cubierto y no cargas con ese gasto en un momento difícil.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro exequial?",
        "a": "Según el plan, cubre el servicio funerario completo: trámites, traslado, sala de velación, cofre y destino final, como inhumación o cremación. También puede incluir a tu grupo familiar y asistencias complementarias."
      },
      {
        "q": "¿Cuánto cuesta un seguro exequial en Colombia?",
        "a": "Depende de cuántas personas incluyas, sus edades y el plan que elijas. Comparamos SURA, Bolívar, HDI, Mapfre, Solidaria y Chubb, y te entregamos la cotización sin costo."
      },
      {
        "q": "¿Cómo adquirir un seguro exequial?",
        "a": "Nos compartes los datos de las personas que quieres incluir y comparamos planes. Por lo general no piden exámenes médicos. Te acompañamos en la solicitud y cuando necesites usar el servicio."
      },
      {
        "q": "¿Dónde contratar un plan exequial en Medellín?",
        "a": "Con Vera Seguros: tenemos sede en Medellín y más de 20 años de experiencia. Comparamos seguros exequiales de varias aseguradoras y te asesoramos sin costo por WhatsApp, en Medellín o en cualquier ciudad de Colombia."
      },
      {
        "q": "¿Hay seguro exequial para adultos mayores o pensionados?",
        "a": "Sí, según la aseguradora. Cada una fija edades máximas de ingreso y permanencia, y algunos planes permiten incluir a tus padres. Dinos las edades de tu familia y te mostramos qué opciones aplican."
      }
    ]
  },
  "plan-credito-protegido": {
    "kw_principal": "seguro de vida deudores",
    "kw_secundarias": [
      "seguro de deudores",
      "seguro de vida para deudores",
      "seguro de vida deudores es obligatorio",
      "seguro de vida deudores para que sirve",
      "que cubre el seguro de vida deudores",
      "seguro de credito hipotecario"
    ],
    "title": "Seguro de vida deudores en Medellín | Vera Seguros",
    "description": "Seguro de vida deudores en Medellín y Colombia: cubre el saldo de tu crédito si faltas. Elige tu aseguradora y cotiza con asesoría sin costo.",
    "h1": "Seguro de vida deudores para proteger tu crédito",
    "intro": "El seguro de vida deudores cubre el saldo de tu crédito si falleces o quedas con incapacidad total y permanente.",
    "faq": [
      {
        "q": "¿Para qué sirve el seguro de vida deudores?",
        "a": "Según la póliza, si falleces o quedas con incapacidad total y permanente, la aseguradora paga el saldo de tu crédito a la entidad. Así tu familia no queda con esa deuda. Algunos planes incluyen alivio de cuotas."
      },
      {
        "q": "¿El seguro de vida deudores es obligatorio?",
        "a": "La ley no lo impone de forma general: cada entidad decide si lo exige como garantía del crédito. Si te lo piden, puedes escoger la aseguradora y el intermediario, y presentar tu póliza si cumple sus condiciones."
      },
      {
        "q": "¿Cuánto cuesta un seguro de deudores?",
        "a": "Depende del saldo y el plazo del crédito, tu edad, tu salud y las coberturas. Comparamos SURA, Bolívar, Allianz, Solidaria y Zurich para que decidas con precios claros, y te cotizamos sin costo."
      },
      {
        "q": "¿Cómo endosar el seguro a mi crédito?",
        "a": "Te cotizamos, eliges la aseguradora y, al expedir la póliza, se endosa a favor de tu entidad, que verifica que cumpla sus condiciones. Te acompañamos en todo el trámite, desde Medellín o donde estés."
      },
      {
        "q": "¿Sirve para un crédito hipotecario, de vehículo o de consumo?",
        "a": "Sí, según la póliza puede proteger créditos hipotecarios, de vehículo, de consumo o tarjetas de crédito en Colombia. En los hipotecarios cubre tu vida; el inmueble se asegura aparte contra incendio y terremoto."
      }
    ]
  },
  "enfermedades-graves": {
    "kw_principal": "seguro de enfermedades graves",
    "kw_secundarias": [
      "poliza enfermedades graves",
      "seguro de enfermedades graves colombia",
      "que es un seguro de enfermedades graves",
      "seguro de cancer",
      "seguro cancer colombia",
      "seguro de vida para enfermedades graves"
    ],
    "title": "Seguro de enfermedades graves en Medellín | Vera Seguros",
    "description": "Seguro de enfermedades graves en Medellín y Colombia: recibe un pago único al diagnóstico de una enfermedad cubierta. Cotiza con asesoría sin costo.",
    "h1": "Seguro de enfermedades graves con pago al diagnóstico",
    "intro": "Con un seguro de enfermedades graves recibes un pago único al diagnóstico de una enfermedad cubierta, para usarlo como necesites.",
    "faq": [
      {
        "q": "¿Qué enfermedades cubre un seguro de enfermedades graves?",
        "a": "Depende de la póliza. Suelen incluir cáncer, infarto, accidente cerebrovascular, insuficiencia renal y trasplante de órganos, entre otras. Cada aseguradora define en su clausulado cuáles cubre y en qué condiciones."
      },
      {
        "q": "¿Cuánto cuesta un seguro de enfermedades graves?",
        "a": "Depende de tu edad, tu salud, si fumas, la suma asegurada y las enfermedades incluidas. Comparamos SURA, Bolívar, Allianz, AXA Colpatria, Mapfre y otras, y te entregamos la cotización sin costo."
      },
      {
        "q": "¿Qué requisitos piden para tomarlo?",
        "a": "Una declaración de salud y, según tu edad y la suma asegurada, exámenes médicos. Por lo general no cubre enfermedades diagnosticadas antes de contratar, y puede haber un periodo de carencia. Revisamos el clausulado contigo."
      },
      {
        "q": "¿Dónde cotizar un seguro de enfermedades graves en Medellín?",
        "a": "En Vera Seguros, desde Medellín y con más de 20 años de experiencia, comparamos varias aseguradoras por ti. Te asesoramos sin costo por WhatsApp, también si vives en otra ciudad de Colombia."
      },
      {
        "q": "¿En qué se diferencia de un seguro de salud o de cáncer?",
        "a": "El seguro de salud paga tu atención médica. Este te entrega dinero al diagnóstico, de libre destinación, por ejemplo para gastos que tu plan de salud no cubre. Y frente a un seguro de cáncer, puede cubrir varias enfermedades."
      }
    ]
  },
  "pension": {
    "kw_principal": "pensión voluntaria",
    "kw_secundarias": [
      "pension voluntaria colombia",
      "que es pension voluntaria",
      "pension voluntaria requisitos",
      "ahorro para pension",
      "fondo pension voluntaria colombia",
      "seguro de pension colombia"
    ],
    "title": "Pensión voluntaria en Medellín y Colombia | Vera Seguros",
    "description": "Pensión voluntaria en Medellín y Colombia: ahorra para tu retiro con aportes flexibles y posibles beneficios tributarios. Cotiza con asesoría sin costo.",
    "h1": "Pensión voluntaria: ahorra para tu retiro",
    "intro": "La pensión voluntaria es un ahorro flexible para complementar tu pensión obligatoria y construir el capital que quieres para tu retiro.",
    "faq": [
      {
        "q": "¿Qué es una pensión voluntaria?",
        "a": "Es un ahorro que haces por tu cuenta para complementar tu pensión obligatoria o construir capital para tu retiro. Tú decides cuánto y cada cuánto aportas, y la rentabilidad depende del plan que elijas."
      },
      {
        "q": "¿Cuánto hay que aportar a una pensión voluntaria?",
        "a": "No hay una cuota única: cada plan fija un aporte mínimo y tú defines el monto y la frecuencia. Según el plan, puedes ajustar tus aportes con el tiempo. Te mostramos las opciones sin costo."
      },
      {
        "q": "¿La pensión voluntaria tiene beneficios tributarios?",
        "a": "Puede tenerlos. Según el artículo 126-1 del Estatuto Tributario, los aportes pueden ser renta exenta, con topes. Si retiras antes de 10 años, salvo para vivienda o al pensionarte, pueden volverse renta gravada. Consulta tu caso con tu contador."
      },
      {
        "q": "¿Cuáles son los requisitos para abrir una pensión voluntaria?",
        "a": "Por lo general, tu documento de identidad, el formulario de vinculación y el primer aporte. Te ayudamos a elegir el plan según tu meta, el plazo y el nivel de riesgo que aceptas."
      },
      {
        "q": "¿Cómo elegir un plan de pensión voluntaria en Colombia?",
        "a": "Compara el aporte mínimo, los costos, la rentabilidad, las opciones de inversión y las condiciones de retiro. Desde Medellín lo hacemos contigo con SURA, Bolívar, Allianz y otras aseguradoras, sin costo."
      }
    ]
  },
  "educacion": {
    "kw_principal": "seguro educativo",
    "kw_secundarias": [
      "seguro de educacion para hijos",
      "seguro educativo colombia",
      "ahorro para la universidad de los hijos colombia",
      "seguro de educacion",
      "cuanto cuesta un seguro educativo",
      "como funciona un seguro de educacion"
    ],
    "title": "Seguro educativo en Medellín y Colombia | Vera Seguros",
    "description": "Seguro educativo en Medellín y Colombia: ahorra para la universidad de tus hijos y protege ese plan si llegas a faltar. Cotiza con asesoría sin costo.",
    "h1": "Seguro educativo para la universidad de tus hijos",
    "intro": "Un seguro educativo te ayuda a ahorrar para el estudio de tus hijos y protege ese plan si llegas a faltar.",
    "faq": [
      {
        "q": "¿Cómo funciona un seguro educativo?",
        "a": "Haces aportes periódicos para reunir el dinero de la educación de tus hijos. Si el tomador fallece, el plan continúa según las condiciones de la póliza, para que el ahorro llegue a su destino."
      },
      {
        "q": "¿Cuánto cuesta un seguro educativo en Colombia?",
        "a": "Depende de la meta de ahorro, la edad de tu hijo, el plazo, tu edad y la frecuencia de los aportes. Comparamos SURA, Bolívar, Allianz, Mapfre y Solidaria, y te cotizamos sin costo."
      },
      {
        "q": "¿Qué requisitos piden para el seguro educativo?",
        "a": "Tus datos y los de tu hijo, la meta de ahorro y, normalmente, una declaración de salud del tomador. Cada aseguradora fija edades máximas de ingreso. Entre más temprano empieces, más tiempo tienes para ahorrar."
      },
      {
        "q": "¿Dónde cotizar un seguro educativo en Medellín?",
        "a": "Con Vera Seguros, agencia con sede en Medellín y más de 20 años de experiencia. Comparamos planes de varias aseguradoras y te asesoramos sin costo por WhatsApp, estés donde estés en Colombia."
      },
      {
        "q": "¿Seguro educativo o cuenta de ahorro para la universidad?",
        "a": "Con una cuenta de ahorro, si llegas a faltar, los aportes se detienen. El seguro educativo suma una protección para que el plan continúe, según la póliza, y te ayuda a ahorrar con disciplina."
      }
    ]
  },
  "seguros-colectivos-de-salud": {
    "kw_principal": "seguro colectivo de salud",
    "kw_secundarias": [
      "que es un seguro colectivo de salud",
      "seguro colectivo complementario de salud",
      "seguro colectivo de salud sura",
      "solicitud para seguro colectivo de salud"
    ],
    "title": "Seguro colectivo de salud para empresas | Vera Seguros",
    "description": "Seguro colectivo de salud para empresas en Medellín y Colombia: especialistas y hospitalización para tu equipo. Cotiza con asesoría sin costo.",
    "h1": "Seguro colectivo de salud para tus empleados",
    "intro": "Un seguro colectivo de salud da a tu equipo acceso a especialistas y hospitalización, y ayuda a tu empresa a retener talento.",
    "faq": [
      {
        "q": "¿Qué es un seguro colectivo de salud?",
        "a": "Es una póliza de salud que tu empresa contrata para un grupo de empleados. Según el plan, cubre consultas con especialistas, hospitalización y cirugía, y puede incluir a sus familias."
      },
      {
        "q": "¿Cuánto cuesta un seguro de salud para empleados?",
        "a": "Depende del número de personas, sus edades, el plan y si incluyes a las familias. También influye si la empresa asume todo el costo o lo comparte. Comparamos aseguradoras y cotizamos sin costo."
      },
      {
        "q": "¿Qué se necesita para contratar una póliza de salud para empresas?",
        "a": "La lista del grupo con edades y el plan que buscas. Cada aseguradora define sus condiciones de ingreso, como número mínimo de personas, edades y preexistencias. Te guiamos en la solicitud y la inscripción."
      },
      {
        "q": "¿Atienden empresas en Medellín y el resto de Colombia?",
        "a": "Sí. Vera Seguros tiene sede en Medellín y más de 20 años de experiencia. Comparamos SURA, Bolívar, Allianz, AXA Colpatria y otras aseguradoras, y te acompañamos en renovaciones, cambios del grupo y reclamaciones."
      },
      {
        "q": "¿El seguro colectivo de salud reemplaza la EPS?",
        "a": "No. Es un beneficio adicional: tus empleados siguen con su EPS y, además, acceden a la red de clínicas y especialistas de la aseguradora, según el plan."
      }
    ]
  },
  "todo-riesgo-empresarial": {
    "kw_principal": "seguro todo riesgo empresarial",
    "kw_secundarias": [
      "seguro para empresas",
      "seguro para empresas precio",
      "seguro todo riesgo para empresas precio",
      "cuanto cuesta un seguro todo riesgo para empresas en colombia",
      "que cubre la poliza todo riesgo daño material",
      "como se llama el seguro para empresas"
    ],
    "title": "Seguro todo riesgo empresarial en Medellín | Vera Seguros",
    "description": "Seguro todo riesgo empresarial en Medellín y Colombia: protege edificio, maquinaria, inventario y operación en una póliza. Cotiza con asesoría sin costo.",
    "h1": "Seguro todo riesgo empresarial en Colombia",
    "intro": "El seguro todo riesgo empresarial protege en una sola póliza los bienes, los equipos y la operación de tu empresa.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro todo riesgo empresarial?",
        "a": "Según la póliza, puede cubrir incendio, daños y eventos de la naturaleza, sustracción y hurto, equipos y maquinaria, responsabilidad civil y lucro cesante: lo que dejas de ganar si un daño cubierto frena tu operación. Te comparamos límites y exclusiones."
      },
      {
        "q": "¿Cuánto cuesta un seguro todo riesgo para empresas en Colombia?",
        "a": "Depende del valor de lo que aseguras (edificio, maquinaria, inventario), la actividad, la ubicación, las medidas de seguridad, los amparos y deducibles que elijas y el historial de siniestros. Te cotizamos sin costo con varias aseguradoras."
      },
      {
        "q": "¿Cómo se llama el seguro para empresas?",
        "a": "Según la aseguradora, se llama todo riesgo empresarial, todo riesgo daño material o seguro empresarial. En general agrupa en una póliza varios amparos para tus bienes y tu operación; lo importante es comparar qué incluye cada opción."
      },
      {
        "q": "¿Qué necesito para cotizar un seguro todo riesgo empresarial?",
        "a": "La actividad de tu empresa, la dirección de los predios y el valor del edificio, la maquinaria, los equipos y el inventario. Con eso comparamos opciones de SURA, Bolívar, Allianz, AXA Colpatria y otras, con asesoría sin costo desde Medellín."
      },
      {
        "q": "¿El seguro todo riesgo empresarial sirve para empresas pequeñas?",
        "a": "Sí, se adapta a empresas de cualquier tamaño y sector. Si tienes un local u oficina pequeña, un seguro pyme, más sencillo y empaquetado, puede ajustarse más a tu caso. Te ayudamos a elegir."
      }
    ]
  },
  "pyme": {
    "kw_principal": "seguro para local comercial",
    "kw_secundarias": [
      "seguro para local comercial precio",
      "seguro para local comercial alquilado",
      "seguro pyme",
      "que es seguro pyme",
      "seguro para negocios",
      "cuanto cuesta un seguro para pymes"
    ],
    "title": "Seguro para local comercial y pymes | Vera Seguros",
    "description": "Seguro para local comercial y pymes en Medellín y Colombia: daños, hurto, responsabilidad civil y asistencias en un plan. Cotiza con asesoría sin costo.",
    "h1": "Seguro para local comercial y negocios",
    "intro": "El seguro para local comercial reúne en un solo plan la protección de tu pyme ante daños, hurto y reclamos de terceros.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro para local comercial?",
        "a": "Según la póliza, puede cubrir daños a los bienes e instalaciones, hurto de contenidos, responsabilidad civil frente a terceros y asistencias para el negocio. Revisamos contigo límites, deducibles y exclusiones de cada opción."
      },
      {
        "q": "¿Cuánto cuesta un seguro para local comercial?",
        "a": "Depende de la actividad del negocio, la ubicación, el valor de la mercancía, los muebles y los equipos, las medidas de seguridad y las coberturas que elijas. Te cotizamos sin costo con varias aseguradoras para que compares."
      },
      {
        "q": "¿Puedo asegurar un local comercial alquilado?",
        "a": "Sí. Puedes asegurar lo que es tuyo, como mercancía, muebles y equipos, y tu responsabilidad civil. Si el contrato de arriendo te exige asegurar el inmueble, también lo revisamos contigo."
      },
      {
        "q": "¿Qué es un seguro pyme?",
        "a": "Es una póliza empaquetada para pequeñas y medianas empresas. Reúne en un solo seguro varias coberturas para tu negocio, como daños, hurto y responsabilidad civil, pensada para ser fácil de entender."
      },
      {
        "q": "¿Cómo contrato un seguro para mi negocio?",
        "a": "Escríbenos por WhatsApp con la actividad, la dirección y el valor aproximado de lo que quieres asegurar. Comparamos SURA, Bolívar, Mapfre, HDI y otras aseguradoras, y te asesoramos sin costo desde Medellín para todo Colombia."
      }
    ]
  },
  "transporte-de-mercancias": {
    "kw_principal": "seguro de transporte de mercancías",
    "kw_secundarias": [
      "póliza de transporte de mercancías",
      "seguro de carga",
      "seguro de carga terrestre colombia",
      "que cubre el seguro de transporte de mercancías",
      "cuanto cuesta un seguro de transporte de mercancías colombia",
      "seguro de carga internacional"
    ],
    "title": "Seguro de transporte de mercancías y carga | Vera Seguros",
    "description": "Seguro de transporte de mercancías en Colombia: protege tu carga terrestre, marítima o aérea ante daño, pérdida y hurto. Cotiza con asesoría sin costo.",
    "h1": "Seguro de transporte de mercancías en Colombia",
    "intro": "El seguro de transporte de mercancías protege tu carga por tierra, mar o aire ante daños, pérdida y hurto.",
    "faq": [
      {
        "q": "¿Qué cubre el seguro de transporte de mercancías?",
        "a": "Según la póliza, puede cubrir daños, pérdida y hurto de tu carga durante el trayecto, en despachos nacionales o internacionales por vía terrestre, marítima o aérea. Revisamos contigo exclusiones, deducibles y condiciones de seguridad."
      },
      {
        "q": "¿Cuánto cuesta un seguro de transporte de mercancías en Colombia?",
        "a": "Depende del tipo y valor de la mercancía, las rutas, el medio de transporte, el número de despachos, el empaque, las medidas de seguridad y el historial de siniestros. Te cotizamos sin costo con varias aseguradoras."
      },
      {
        "q": "¿Cómo contratar un seguro de carga?",
        "a": "Cuéntanos qué transportas, su valor, el origen y destino, el medio de transporte y cada cuánto despachas. Con eso comparamos opciones de SURA, Allianz, Mapfre, Zurich y otras, y te acompañamos en la contratación."
      },
      {
        "q": "¿Cubre carga terrestre en Colombia y carga internacional?",
        "a": "Sí. Puede cubrir trayectos por carretera dentro de Colombia y despachos de importación o exportación por mar o aire, según la póliza. Te asesoramos desde Medellín para empresas de todo el país."
      },
      {
        "q": "¿Puedo asegurar un solo despacho?",
        "a": "Sí. Puedes asegurar un despacho puntual o, si envías mercancía con frecuencia, cubrir tus despachos con una póliza automática. Te ayudamos a elegir según tu volumen."
      }
    ]
  },
  "transporte": {
    "kw_principal": "seguro de transporte de valores",
    "kw_secundarias": [
      "poliza de transporte de valores",
      "seguro para transporte de valores",
      "qué excluye el seguro de transporte de valores",
      "que cubre la poliza de transporte",
      "que es una poliza flotante de transporte",
      "seguro de transporte en colombia"
    ],
    "title": "Seguro de transporte de valores en Colombia | Vera Seguros",
    "description": "Seguro de transporte de valores y póliza automática en Colombia: protege dinero y bienes en tránsito. Cotiza desde Medellín con asesoría sin costo.",
    "h1": "Seguro de transporte de valores y póliza automática",
    "intro": "El seguro de transporte de valores protege el dinero y los bienes que movilizas, con póliza automática si despachas seguido.",
    "faq": [
      {
        "q": "¿Qué cubre el seguro de transporte de valores?",
        "a": "Según la póliza, puede cubrir la pérdida o el hurto de dinero, cheques y títulos valores mientras se trasladan, por ejemplo entre tus puntos de venta y la oficina, con mensajeros propios o con una transportadora de valores."
      },
      {
        "q": "¿Qué excluye el seguro de transporte de valores?",
        "a": "Depende del clausulado. Cada póliza fija exclusiones y condiciones, como límites por despacho o medidas de seguridad para ciertos montos. Antes de contratar te mostramos las de cada aseguradora para que compares."
      },
      {
        "q": "¿Qué es una póliza automática o flotante de transporte?",
        "a": "Cubre tus despachos durante la vigencia, según lo pactado, sin tomar un seguro por cada envío. El Código de Comercio (art. 1050) prevé que el valor y los datos de cada despacho se definan en declaraciones posteriores."
      },
      {
        "q": "¿Cuánto cuesta un seguro de transporte?",
        "a": "Depende del valor que movilizas al año o por despacho, la frecuencia, las rutas, el medio de transporte, las medidas de seguridad y el historial de pérdidas. Te cotizamos sin costo con varias aseguradoras."
      },
      {
        "q": "¿Cómo contrato un seguro de transporte en Colombia?",
        "a": "Escríbenos desde cualquier ciudad. Te pedimos qué movilizas, cuánto, cada cuánto y cómo lo transportas. Desde Medellín comparamos SURA, Bolívar, Allianz, Chubb y otras, y te asesoramos sin costo."
      }
    ]
  },
  "fraude": {
    "kw_principal": "póliza de infidelidad y riesgos financieros",
    "kw_secundarias": [
      "que cubre la poliza de infidelidad y riesgos financieros",
      "que es una poliza de infidelidad y riesgos financieros",
      "poliza de manejo global comercial",
      "que cubre la poliza de manejo global",
      "poliza de manejo",
      "que cubre el seguro de fraude"
    ],
    "title": "Póliza de infidelidad y riesgos financieros | Vera Seguros",
    "description": "Póliza de infidelidad y riesgos financieros en Colombia: protege tu empresa de fraude, hurto y estafa. Cotiza desde Medellín con asesoría sin costo.",
    "h1": "Póliza de infidelidad y riesgos financieros",
    "intro": "La póliza de infidelidad y riesgos financieros protege a tu empresa de pérdidas por fraude, hurto o estafa de empleados y terceros.",
    "faq": [
      {
        "q": "¿Qué cubre la póliza de infidelidad y riesgos financieros?",
        "a": "Según la póliza, puede cubrir pérdidas de dinero o bienes por hurto, hurto calificado, falsedad, estafa o abuso de confianza de tus empleados, incluso no identificados, y bienes de terceros bajo tu cuidado. Algunas suman fraudes de terceros, como falsificaciones."
      },
      {
        "q": "¿Es lo mismo que la póliza de manejo global?",
        "a": "Se parecen. La de manejo global comercial se centra en apropiaciones cometidas por tus empleados; la de infidelidad y riesgos financieros suele sumar pérdidas causadas por terceros. El buen manejo del anticipo es otra cosa: va en la póliza de cumplimiento."
      },
      {
        "q": "¿Cuánto cuesta una póliza de infidelidad y riesgos financieros?",
        "a": "Depende del valor asegurado, la actividad, el número de empleados y de cargos que manejan dinero, tus controles internos y el historial de pérdidas. Te cotizamos sin costo con Chubb, AXA Colpatria, Zurich, HDI y otras."
      },
      {
        "q": "¿Qué empresas necesitan un seguro contra fraude?",
        "a": "Las que confían a su equipo dinero, valores, inventario o pagos, como comercios, distribuidoras o empresas con cajas y recaudos. Si alguien maneja recursos de tu empresa, vale la pena evaluarlo."
      },
      {
        "q": "¿Cómo contrato un seguro contra fraude para mi empresa?",
        "a": "Escríbenos por WhatsApp. Te pedimos datos de la empresa, número de empleados, cargos que manejan dinero y controles internos. Desde Medellín comparamos aseguradoras para empresas de todo Colombia, con asesoría sin costo."
      }
    ]
  },
  "cumplimiento": {
    "kw_principal": "póliza de cumplimiento",
    "kw_secundarias": [
      "poliza de cumplimiento de contrato",
      "poliza de cumplimiento medellin",
      "seguro de cumplimiento",
      "cuanto cuesta una póliza de cumplimiento de contrato",
      "requisitos para poliza de cumplimiento",
      "como cargar poliza de cumplimiento en secop ii"
    ],
    "title": "Póliza de cumplimiento en Medellín y Colombia | Vera Seguros",
    "description": "Póliza de cumplimiento en Medellín para contratos públicos y privados en Colombia. Comparamos aseguradoras y te guiamos. Cotiza con asesoría sin costo.",
    "h1": "Póliza de cumplimiento de contrato en Medellín",
    "intro": "La póliza de cumplimiento respalda ante tu contratante, público o privado, las obligaciones que asumes en el contrato.",
    "faq": [
      {
        "q": "¿Qué cubre una póliza de cumplimiento?",
        "a": "Según lo que exija el contrato, puede incluir seriedad de la oferta, cumplimiento del contrato, buen manejo del anticipo, calidad del servicio, estabilidad de obra y pago de salarios y prestaciones. Cada amparo lleva su propio valor asegurado y vigencia."
      },
      {
        "q": "¿Cuánto cuesta una póliza de cumplimiento?",
        "a": "Depende del valor del contrato, los amparos, los valores asegurados y la vigencia que te exigen, y de tu perfil como contratista: experiencia y capacidad financiera. Te cotizamos sin costo con Bolívar, Mundial, Seguros del Estado, Solidaria y otras."
      },
      {
        "q": "¿Qué requisitos piden para una póliza de cumplimiento?",
        "a": "Suelen pedir el contrato, pliego o invitación, el RUT, la cédula y, si eres empresa, el certificado de existencia y representación legal. Según el monto, también estados financieros. Cada aseguradora define su lista."
      },
      {
        "q": "¿Dónde saco una póliza de cumplimiento en Medellín?",
        "a": "En Vera Seguros, agencia de seguros en Medellín con más de 20 años. Tramitamos pólizas de cumplimiento para contratos públicos y privados, incluida la prestación de servicios, y atendemos empresas y personas de toda Colombia."
      },
      {
        "q": "¿Es obligatoria la póliza de cumplimiento en contratos con el Estado?",
        "a": "Por regla general, sí se exige garantía (Ley 1150 de 2007, art. 7), salvo excepciones como empréstitos o contratos interadministrativos. La póliza es una de las garantías aceptadas (Decreto 1082 de 2015). En SECOP II la cargas y la entidad la revisa y aprueba."
      }
    ]
  },
  "cauciones-y-garantias": {
    "kw_principal": "póliza de caución judicial",
    "kw_secundarias": [
      "caución judicial colombia",
      "que es una poliza de caucion judicial",
      "poliza de caucion",
      "cuanto cuesta una poliza de caucion",
      "poliza de seriedad de la oferta",
      "póliza de seriedad de la oferta es subsanable"
    ],
    "title": "Póliza de caución judicial en Colombia | Vera Seguros",
    "description": "Póliza de caución judicial y de seriedad de la oferta en Colombia. Comparamos aseguradoras y te guiamos. Cotiza desde Medellín con asesoría sin costo.",
    "h1": "Póliza de caución judicial y de seriedad de la oferta",
    "intro": "Con una póliza de caución judicial presentas la garantía que te exige el juez; también tramitamos pólizas de seriedad de la oferta.",
    "faq": [
      {
        "q": "¿Qué es una caución judicial en Colombia?",
        "a": "Es la garantía que un juez puede exigir en un proceso, por ejemplo para decretar o levantar medidas cautelares. Respalda costas o perjuicios, según el caso, y el Código General del Proceso (art. 603) permite que la otorgue una compañía de seguros."
      },
      {
        "q": "¿Cuánto cuesta una póliza de caución?",
        "a": "Depende del valor a garantizar, que fija el juez, la ley o el pliego, del plazo, del tipo de caución y de tu perfil. Te cotizamos sin costo con Seguros del Estado, Mundial, Solidaria, Bolívar y otras."
      },
      {
        "q": "¿Cómo sacar una póliza de caución judicial?",
        "a": "Envíanos la providencia que ordena la caución, con valor y plazo, y tus datos. Si la aseguradora la aprueba, expide la póliza y la presentas al juzgado, que califica su suficiencia y la acepta o rechaza (CGP, art. 604)."
      },
      {
        "q": "¿Qué cubre la póliza de seriedad de la oferta?",
        "a": "Cubre la sanción si, por ejemplo, retiras tu oferta tras el cierre o, al ganar, no firmas el contrato o no entregas la garantía de cumplimiento. En contratos estatales, por regla general, debe cubrir mínimo el 10 % de la oferta (Decreto 1082 de 2015)."
      },
      {
        "q": "¿La póliza de seriedad de la oferta es subsanable?",
        "a": "En contratación estatal, no entregarla junto con la propuesta no es subsanable y es causal de rechazo (Ley 1150 de 2007, art. 5, par. 3, adicionado por la Ley 1882 de 2018). Por eso conviene tramitarla con tiempo; te ayudamos."
      }
    ]
  },
  "todo-riesgo-construccion": {
    "kw_principal": "seguro todo riesgo construcción",
    "kw_secundarias": [
      "poliza todo riesgo construccion",
      "poliza todo riesgo construccion y montaje",
      "seguro todo riesgo construccion y montaje",
      "que cubre una poliza todo riesgo construccion",
      "seguro todo riesgo construcción precio",
      "seguro todo riesgo construccion es obligatorio"
    ],
    "title": "Seguro todo riesgo construcción y montaje | Vera Seguros",
    "description": "Seguro todo riesgo construcción y montaje en Colombia: protege tu obra, maquinaria y responsabilidad civil. Cotiza desde Medellín con asesoría sin costo.",
    "h1": "Seguro todo riesgo construcción para tu obra",
    "intro": "El seguro todo riesgo construcción protege tu obra o montaje ante daños, eventos de la naturaleza y reclamos de terceros.",
    "faq": [
      {
        "q": "¿Qué cubre una póliza todo riesgo construcción?",
        "a": "Según la póliza, puede cubrir daños a la obra durante su ejecución, eventos de la naturaleza, responsabilidad civil frente a terceros y maquinaria y equipos de obra. Revisamos contigo exclusiones, deducibles y vigencia."
      },
      {
        "q": "¿Cuánto cuesta un seguro todo riesgo construcción?",
        "a": "Depende del valor y el tipo de obra, su duración, la ubicación, los amparos adicionales, los deducibles y la experiencia del constructor. Te cotizamos sin costo con SURA, Bolívar, Allianz, Mapfre y otras aseguradoras."
      },
      {
        "q": "¿El seguro todo riesgo construcción es obligatorio?",
        "a": "Depende del contrato. Puede exigirlo el dueño de la obra, la entidad contratante o quien financia el proyecto. Revisa tu contrato: te ayudamos a cumplir los amparos y valores que te piden."
      },
      {
        "q": "¿En qué se diferencia de la póliza de cumplimiento?",
        "a": "El todo riesgo construcción protege la obra y tu responsabilidad frente a terceros durante la ejecución. La póliza de cumplimiento, en cambio, respalda ante el contratante tus obligaciones, como la estabilidad de la obra. Algunos contratos exigen ambas."
      },
      {
        "q": "¿Qué necesito para cotizar un seguro todo riesgo construcción?",
        "a": "El tipo de obra o montaje, su valor, el cronograma, la ubicación y la maquinaria que usarás. Desde Medellín asesoramos sin costo a constructoras y contratistas de todo Colombia."
      }
    ]
  },
  "clinicas-hospitales-y-profesionales-de-la-salud": {
    "kw_principal": "póliza de responsabilidad civil médica",
    "kw_secundarias": [
      "póliza de responsabilidad civil para médicos",
      "seguro de responsabilidad civil médica",
      "póliza de responsabilidad civil profesional para médicos",
      "póliza de responsabilidad civil clínicas y hospitales",
      "seguro de responsabilidad civil médica precio",
      "contratar seguro de responsabilidad civil médica"
    ],
    "title": "Póliza de responsabilidad civil médica | Vera Seguros",
    "description": "Póliza de responsabilidad civil médica para médicos, clínicas y hospitales en Medellín y Colombia. Comparamos aseguradoras. Cotiza con asesoría sin costo.",
    "h1": "Póliza de responsabilidad civil médica en Medellín",
    "intro": "La póliza de responsabilidad civil médica respalda a profesionales de la salud, clínicas y hospitales ante reclamaciones de pacientes.",
    "faq": [
      {
        "q": "¿Qué cubre la póliza de responsabilidad civil médica?",
        "a": "Según la póliza, puede cubrir la responsabilidad civil profesional de médicos y profesionales de la salud, la de clínicas y hospitales, la defensa jurídica y las reclamaciones de pacientes, dentro del valor asegurado y las condiciones pactadas."
      },
      {
        "q": "¿Cuánto cuesta un seguro de responsabilidad civil médica?",
        "a": "Depende de tu especialidad o del tipo de institución, los procedimientos que realizas, el valor asegurado y el historial de reclamaciones. En Vera comparamos SURA, Allianz, Chubb, HDI y otras aseguradoras, y te cotizamos sin costo."
      },
      {
        "q": "¿Cómo contratar la póliza de responsabilidad civil para médicos?",
        "a": "Cuéntanos tu especialidad o el tipo de institución, los servicios que prestas y el valor asegurado que necesitas o que te exige un contrato. Comparamos opciones, te explicamos las exclusiones y te acompañamos hasta la emisión."
      },
      {
        "q": "¿Hay póliza de responsabilidad civil para clínicas y hospitales?",
        "a": "Sí. Además de las pólizas para médicos y profesionales de la salud, hay coberturas para la responsabilidad de clínicas, hospitales y otras instituciones de salud. Te ayudamos a definir cuál necesitas y a comparar aseguradoras."
      },
      {
        "q": "¿Dónde cotizar una póliza de responsabilidad civil médica en Medellín?",
        "a": "En Vera Seguros, con sede en Medellín, asesoramos a médicos, profesionales de la salud, clínicas y hospitales de toda Colombia. Comparamos opciones de SURA, Bolívar, AXA Colpatria, Mapfre y más, y la asesoría no tiene costo."
      }
    ]
  },
  "directivos-y-administradores": {
    "kw_principal": "seguro de directores y administradores",
    "kw_secundarias": [
      "póliza de directores y administradores",
      "póliza d&o",
      "qué cubre la póliza de directores y administradores",
      "póliza d&o qué es",
      "seguro para directores y administradores"
    ],
    "title": "Seguro de directores y administradores (D&O) | Vera Seguros",
    "description": "Seguro de directores y administradores (D&O) en Medellín y Colombia: protege el patrimonio de juntas y gerentes. Compara y cotiza con asesoría sin costo.",
    "h1": "Seguro de directores y administradores (póliza D&O)",
    "intro": "El seguro de directores y administradores (D&O) protege el patrimonio de juntas directivas y gerentes ante reclamaciones por su gestión.",
    "faq": [
      {
        "q": "¿Qué es una póliza D&O y qué cubre?",
        "a": "Es la póliza de directores y administradores (en inglés, Directors & Officers). Según sus condiciones, puede cubrir la defensa jurídica de los directivos, las indemnizaciones por reclamaciones, los costos de investigación y, en algunos casos, a la empresa."
      },
      {
        "q": "¿A quién protege la póliza de directores y administradores?",
        "a": "La póliza define quiénes son asegurados. Como referencia, la Ley 222 de 1995 (art. 22) considera administradores al representante legal, el liquidador, el factor, los miembros de juntas o consejos directivos y quienes, según los estatutos, ejerzan o detenten esas funciones."
      },
      {
        "q": "¿Por qué un gerente o miembro de junta necesita un seguro D&O?",
        "a": "Porque la Ley 222 de 1995 (art. 24) hace responder a los administradores, solidaria e ilimitadamente, por los perjuicios que causen por dolo o culpa. La D&O protege su patrimonio según la póliza, aunque el dolo no es asegurable (Código de Comercio, art. 1055)."
      },
      {
        "q": "¿Cuánto cuesta un seguro D&O?",
        "a": "Depende del tamaño y el sector de la empresa, su situación financiera, el valor asegurado y el historial de reclamaciones. En Vera comparamos opciones de SURA, Chubb, Allianz, Zurich y otras aseguradoras, y te cotizamos sin costo."
      },
      {
        "q": "¿Qué necesito para cotizar una póliza D&O?",
        "a": "Por lo general, información de la empresa: actividad, tamaño, estados financieros y antecedentes de reclamaciones. Cada aseguradora define su formulario. Desde Medellín te guiamos en el proceso y comparamos opciones para empresas de toda Colombia."
      }
    ]
  },
  "proteccion-legal": {
    "kw_principal": "seguro de protección legal",
    "kw_secundarias": [
      "seguro jurídico",
      "seguro jurídico para empresas",
      "seguro jurídico colombia",
      "seguro jurídico precio",
      "qué es seguro jurídico"
    ],
    "title": "Seguro de protección legal para empresas | Vera Seguros",
    "description": "Seguro de protección legal para empresas en Medellín y Colombia: asesoría jurídica y apoyo en tu defensa, según la póliza. Cotiza con asesoría sin costo.",
    "h1": "Seguro de protección legal y asistencia jurídica",
    "intro": "Con el seguro de protección legal, tu empresa cuenta con asesoría jurídica y respaldo en su defensa, según la póliza.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro de protección legal?",
        "a": "Según la póliza, puede incluir asesoría jurídica, costos de defensa legal, honorarios de abogados y acompañamiento en procesos. Cada aseguradora define qué tipos de conflicto ampara, los límites y las exclusiones."
      },
      {
        "q": "¿Qué es un seguro jurídico para empresas?",
        "a": "Así se le dice también al seguro de protección legal: una póliza que le da a tu empresa asesoría jurídica y respaldo en su defensa ante conflictos o procesos, dentro de las condiciones pactadas."
      },
      {
        "q": "¿Cuánto cuesta un seguro jurídico?",
        "a": "Depende de la actividad y el tamaño de tu empresa, los tipos de conflicto que quieras amparar y los límites de la póliza. En Vera comparamos opciones de SURA, Allianz, Zurich, Chubb y SBS, y te cotizamos sin costo."
      },
      {
        "q": "¿Cómo contratar un seguro de protección legal para mi empresa?",
        "a": "Cuéntanos a qué se dedica tu empresa, cuántas personas trabajan en ella y qué respaldo jurídico buscas. Comparamos coberturas y exclusiones de varias aseguradoras y te acompañamos hasta la emisión de la póliza."
      },
      {
        "q": "¿Dónde cotizar un seguro jurídico en Colombia?",
        "a": "En Vera Seguros, con sede en Medellín, cotizamos seguros de protección legal para empresas de toda Colombia. Comparamos varias aseguradoras y te explicamos las diferencias. La asesoría no tiene costo."
      }
    ]
  },
  "proteccion-digital": {
    "kw_principal": "seguro de protección digital",
    "kw_secundarias": [
      "seguro de protección digital sura",
      "seguro contra hackeo",
      "seguro contra fraudes digitales",
      "seguro contra phishing",
      "seguro contra suplantación de identidad"
    ],
    "title": "Seguro de protección digital para empresas | Vera Seguros",
    "description": "Seguro de protección digital para empresas en Medellín y Colombia: puede cubrir fraude electrónico y pérdida de datos. Cotiza con asesoría sin costo.",
    "h1": "Seguro de protección digital contra fraude electrónico",
    "intro": "El seguro de protección digital respalda a tu empresa ante fraude electrónico, ciberataques y pérdida de datos, según la póliza.",
    "faq": [
      {
        "q": "¿Qué cubre un seguro de protección digital?",
        "a": "Según la póliza, puede cubrir la respuesta a incidentes, la restauración de datos, pérdidas por fraude electrónico, la responsabilidad por filtración de información y la interrupción del negocio. Cada aseguradora define límites y exclusiones."
      },
      {
        "q": "¿Sirve como seguro contra hackeo y fraude electrónico?",
        "a": "Según la póliza, sí: puede cubrir pérdidas por fraude electrónico y los costos de responder a un hackeo. Revisa con nosotros qué modalidades ampara, como la suplantación o el phishing, y cuáles excluye."
      },
      {
        "q": "¿Cuánto cuesta un seguro de protección digital para empresas?",
        "a": "Depende de tu actividad, la facturación, el tipo y volumen de datos que manejas, tus controles de seguridad y el valor asegurado. En Vera comparamos opciones de SURA, Bolívar, Allianz, AXA Colpatria, Zurich y Chubb sin costo."
      },
      {
        "q": "¿Cómo contratar un seguro de protección digital?",
        "a": "Cuéntanos a qué se dedica tu empresa, cómo hace y recibe pagos y qué información digital maneja. La aseguradora puede pedirte un cuestionario de seguridad. Desde Medellín te ayudamos a diligenciarlo y comparamos opciones."
      },
      {
        "q": "¿Qué hago si mi empresa sufre un fraude electrónico?",
        "a": "Avisa a tu aseguradora cuanto antes: el Código de Comercio (art. 1075) fija tres días desde que conoces o debiste conocer el siniestro, y la póliza puede ampliarlos. Guarda la evidencia, denuncia el hecho y llámanos para acompañarte en la reclamación."
      }
    ]
  },
  "cyber": {
    "kw_principal": "seguro cibernético",
    "kw_secundarias": [
      "ciberseguro para empresas",
      "seguro de riesgos cibernéticos",
      "póliza de seguro cibernético",
      "ciberseguro para pymes",
      "póliza cyber",
      "seguro de ciberseguridad para empresas"
    ],
    "title": "Seguro cibernético para empresas en Medellín | Vera Seguros",
    "description": "Seguro cibernético para empresas en Medellín y Colombia: respuesta a ciberataques, recuperación de datos y filtraciones. Cotiza con asesoría sin costo.",
    "h1": "Seguro cibernético (póliza cyber) para empresas",
    "intro": "El seguro cibernético respalda a tu empresa para responder a un ciberataque, recuperar sus datos y atender reclamaciones, según la póliza.",
    "faq": [
      {
        "q": "¿Qué es y qué cubre un seguro cibernético?",
        "a": "Es una póliza que ayuda a tu empresa a afrontar un ciberataque. Según sus condiciones, puede cubrir la respuesta al incidente, la recuperación de datos y sistemas, la responsabilidad por filtración de datos y la extorsión cibernética, como el ransomware."
      },
      {
        "q": "¿Cuánto cuesta un ciberseguro para pymes?",
        "a": "Depende de la actividad y la facturación de la empresa, los datos que maneja, sus controles de seguridad, los incidentes previos y el valor asegurado. En Vera comparamos SURA, Allianz, Chubb, Zurich, Mapfre y otras aseguradoras, sin costo."
      },
      {
        "q": "¿Qué piden para contratar un ciberseguro para empresas?",
        "a": "Por lo general, datos de la empresa y un cuestionario sobre tus controles, como copias de respaldo, antivirus y autenticación de doble factor. Cada aseguradora define el suyo; te ayudamos a diligenciarlo y comparamos opciones."
      },
      {
        "q": "¿Qué exige la ley si mi empresa sufre una filtración de datos?",
        "a": "Si tu empresa trata datos personales, la Ley 1581 de 2012 (arts. 17 y 18) exige protegerlos e informar a la SIC las violaciones a los códigos de seguridad que pongan en riesgo esa información. La póliza puede cubrir la respuesta al incidente."
      },
      {
        "q": "¿Dónde contratar un seguro cibernético en Medellín?",
        "a": "En Vera Seguros, con sede en Medellín, comparamos pólizas cyber de SURA, Bolívar, Allianz, AXA Colpatria, Chubb, Zurich y más para empresas de toda Colombia. La asesoría no tiene costo."
      }
    ]
  },
  "responsabilidad-civil": {
    "kw_principal": "póliza de responsabilidad civil extracontractual",
    "kw_secundarias": [
      "póliza de responsabilidad civil",
      "seguro de responsabilidad civil",
      "póliza de responsabilidad civil extracontractual precio",
      "póliza de responsabilidad civil para empresas",
      "seguro de responsabilidad civil colombia",
      "póliza de responsabilidad civil requisitos"
    ],
    "title": "Póliza de responsabilidad civil extracontractual en Medellín",
    "description": "Póliza de responsabilidad civil extracontractual en Medellín y Colombia: te respalda ante daños a terceros. Compara y cotiza con asesoría sin costo.",
    "h1": "Póliza de responsabilidad civil extracontractual",
    "intro": "La póliza de responsabilidad civil extracontractual te respalda, según sus condiciones, si tu actividad causa daños a terceros.",
    "faq": [
      {
        "q": "¿Qué cubre una póliza de responsabilidad civil extracontractual?",
        "a": "Responde por daños que causes a terceros con quienes no tienes contrato, como un peatón o un vecino. Según la póliza, puede incluir daños a personas y bienes, gastos de defensa y predios, labores y operaciones. También hay opciones con amparo contractual."
      },
      {
        "q": "¿Cuánto cuesta una póliza de responsabilidad civil extracontractual en Colombia?",
        "a": "Depende de tu actividad, el valor asegurado, el deducible, el tamaño de la operación y el historial de reclamaciones. En Vera comparamos opciones de SURA, Bolívar, Allianz, Mundial y otras aseguradoras, y te cotizamos sin costo."
      },
      {
        "q": "¿Cómo sacar una póliza de responsabilidad civil y qué requisitos piden?",
        "a": "Cuéntanos tu actividad, dónde operas y el valor asegurado que necesitas o que te exige un contrato. La aseguradora puede pedirte un formulario y algunos documentos. Comparamos opciones y te acompañamos hasta la emisión."
      },
      {
        "q": "¿Cuándo piden póliza de responsabilidad civil extracontractual en contratos estatales?",
        "a": "Según el Decreto 1082 de 2015 (art. 2.2.1.2.3.1.8), la entidad estatal debe exigirla en contratos de obra y en los que, por su objeto o naturaleza, considere necesario por los riesgos del contrato. Revisa el pliego y te ayudamos a tramitarla."
      },
      {
        "q": "¿Dónde sacar una póliza de responsabilidad civil en Medellín?",
        "a": "En Vera Seguros, con sede en Medellín, comparamos pólizas de responsabilidad civil para empresas, profesionales y personas de toda Colombia. Si eres profesional independiente, también revisamos opciones de responsabilidad civil profesional. La asesoría no tiene costo."
      }
    ]
  },
};
