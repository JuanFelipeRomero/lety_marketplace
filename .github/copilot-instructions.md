# Project Overview

This web platform (called Lety Marketplace) is being developed to address the difficulties pet owners encounter when seeking trustworthy veterinary services within Bogotá. It aims to serve as a central hub facilitating the management and selection of these services, allowing users to more easily find and choose appropriate veterinary care for their pets in the city. The application focuses on enhancing the connection between veterinary clinics and potential clients, improving the decision-making process for pet owners by providing relevant information, and fostering trust within the Bogotá veterinary market through a dedicated digital solution.

# Personality

The model is configured to be direct and explanatory. It delivers concise responses that clearly state any changes or actions taken. For every modification, the model provides a brief explanation of the reason and effect, focusing solely on the essential details needed for understanding the adjustment while omitting unnecessary information.

Additionally, every response will begin with the 🤖 emoji.

# Tech Stack

## Frontend

In the frontend the technologies used are:

- Typescript
- React router v7
- React (as a library)
- Tailwind
- Shadcn (Component library)
- Lucide React (Icons)

## Backend

In the backend the technologies used are:

- Node.js
- Express.js
- Playwright (testing library)

# Database

For the database, currently is being used postgresql in a Supabase database. The SQL code for the structure of the database is:

```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.citas (
  id_cita integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario integer NOT NULL,
  id_mascota integer NOT NULL,
  id_clinica integer NOT NULL,
  id_servicio integer NOT NULL,
  fecha_inicio timestamp without time zone,
  fecha_fin timestamp without time zone,
  estado character varying,
  acepto_terminos boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  horario character varying,
  motivo text,
  notas_adicionales text,
  preferencia_recordatorio character varying,
  trazabilidad jsonb,
  diagnostico text,
  tratamiento text,
  medicamentos jsonb,
  recomendaciones text,
  instrucciones_seguimiento text,
  notas_internas text,
  servicios_adicionales jsonb,
  productos_vendidos jsonb,
  motivo_reprogramacion text,
  motivo_cancelacion text,
  CONSTRAINT citas_pkey PRIMARY KEY (id_cita),
  CONSTRAINT citas_id_clinica_fkey FOREIGN KEY (id_clinica) REFERENCES public.clinicas(id_clinica),
  CONSTRAINT citas_id_mascota_fkey FOREIGN KEY (id_mascota) REFERENCES public.mascotas(id_mascota),
  CONSTRAINT citas_id_servicio_fkey FOREIGN KEY (id_servicio) REFERENCES public.servicios(id_servicio),
  CONSTRAINT citas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.clinica_especialidades (
  id_clinica integer NOT NULL,
  id_especialidad integer NOT NULL,
  CONSTRAINT clinica_especialidades_pkey PRIMARY KEY (id_clinica, id_especialidad),
  CONSTRAINT clinica_especialidades_id_clinica_fkey FOREIGN KEY (id_clinica) REFERENCES public.clinicas(id_clinica),
  CONSTRAINT clinica_especialidades_id_especialidad_fkey FOREIGN KEY (id_especialidad) REFERENCES public.especialidades(id_especialidad)
);
CREATE TABLE public.clinicas (
  id_clinica integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying,
  direccion character varying,
  telefono character varying,
  correo character varying UNIQUE,
  contrasena character varying,
  descripcion text,
  NIT text UNIQUE,
  estado character varying DEFAULT 'pendiente'::character varying,
  fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  certificado_url text,
  sitio_web text,
  codigo_postal text,
  ciudad text,
  detalles jsonb,
  latitud numeric,
  longitud numeric,
  CONSTRAINT clinicas_pkey PRIMARY KEY (id_clinica)
);
CREATE TABLE public.especialidades (
  id_especialidad integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying,
  CONSTRAINT especialidades_pkey PRIMARY KEY (id_especialidad)
);
CREATE TABLE public.favoritos (
  id_usuario integer NOT NULL,
  id_clinica integer NOT NULL,
  fecha_agregado timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT favoritos_pkey PRIMARY KEY (id_usuario, id_clinica),
  CONSTRAINT favoritos_id_clinica_fkey FOREIGN KEY (id_clinica) REFERENCES public.clinicas(id_clinica),
  CONSTRAINT favoritos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.fotos_clinicas (
  id_foto integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_clinica integer NOT NULL,
  titulo character varying NOT NULL,
  url character varying NOT NULL,
  tipo character varying NOT NULL,
  es_principal boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fotos_clinicas_pkey PRIMARY KEY (id_foto),
  CONSTRAINT fotos_clinicas_id_clinica_fkey FOREIGN KEY (id_clinica) REFERENCES public.clinicas(id_clinica)
);
CREATE TABLE public.horarios_atencion (
  id_horario integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_clinica integer NOT NULL,
  dia_semana character varying,
  hora_apertura time without time zone,
  hora_cierre time without time zone,
  es_24h boolean DEFAULT false,
  esta_cerrado boolean DEFAULT false,
  CONSTRAINT horarios_atencion_pkey PRIMARY KEY (id_horario),
  CONSTRAINT horarios_atencion_id_clinica_fkey FOREIGN KEY (id_clinica) REFERENCES public.clinicas(id_clinica)
);
CREATE TABLE public.mascotas (
  id_mascota integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario integer NOT NULL,
  nombre character varying,
  edad integer,
  raza character varying,
  historial_medico text,
  foto_url character varying,
  especie character varying,
  genero text CHECK (genero = ANY (ARRAY['Macho'::text, 'Hembra'::text])),
  peso numeric CHECK (peso > 0::numeric),
  CONSTRAINT mascotas_pkey PRIMARY KEY (id_mascota),
  CONSTRAINT mascotas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.notificaciones (
  id_notificacion integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario integer NOT NULL,
  id_clinica integer NOT NULL,
  mensaje text,
  fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  leido boolean DEFAULT false,
  CONSTRAINT notificaciones_pkey PRIMARY KEY (id_notificacion),
  CONSTRAINT notificaciones_id_clinica_fkey FOREIGN KEY (id_clinica) REFERENCES public.clinicas(id_clinica),
  CONSTRAINT notificaciones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.reseñas (
  id_resena integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario integer NOT NULL,
  id_clinica integer NOT NULL,
  calificacion integer,
  comentario text,
  fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reseñas_pkey PRIMARY KEY (id_resena),
  CONSTRAINT reseñas_id_clinica_fkey FOREIGN KEY (id_clinica) REFERENCES public.clinicas(id_clinica),
  CONSTRAINT reseñas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.servicios (
  id_servicio integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_clinica integer NOT NULL,
  nombre character varying,
  descripcion text,
  precio numeric,
  categoria character varying,
  disponible boolean DEFAULT true,
  duracion_minutos integer,
  CONSTRAINT servicios_pkey PRIMARY KEY (id_servicio),
  CONSTRAINT servicios_id_clinica_fkey FOREIGN KEY (id_clinica) REFERENCES public.clinicas(id_clinica)
);
CREATE TABLE public.usuarios (
  id_usuario integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying,
  correo character varying UNIQUE,
  contrasena character varying,
  telefono character varying UNIQUE,
  fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario)
);
```

# Current File structure
├───.cursor
│   └───rules
├───.github
├───backend
│   ├───node_modules
│   │   ├───.bin
│   │   ├───@mapbox
│   │   │   └───node-pre-gyp
│   │   │       ├───.github
│   │   │       │   └───workflows
│   │   │       ├───bin
│   │   │       └───lib
│   │   │           └───util
│   │   │               └───nw-pre-gyp
│   │   ├───@playwright
│   │   │   └───test
│   │   ├───@supabase
│   │   │   ├───auth-js
│   │   │   │   ├───dist
│   │   │   │   │   ├───main
│   │   │   │   │   │   └───lib
│   │   │   │   │   └───module
│   │   │   │   │       └───lib
│   │   │   │   └───src
│   │   │   │       └───lib
│   │   │   ├───functions-js
│   │   │   │   ├───dist
│   │   │   │   │   ├───main
│   │   │   │   │   └───module
│   │   │   │   └───src
│   │   │   ├───node-fetch
│   │   │   │   └───lib
│   │   │   ├───postgrest-js
│   │   │   │   ├───dist
│   │   │   │   │   ├───cjs
│   │   │   │   │   │   └───select-query-parser
│   │   │   │   │   └───esm
│   │   │   │   └───src
│   │   │   │       └───select-query-parser
│   │   │   ├───realtime-js
│   │   │   │   ├───dist
│   │   │   │   │   ├───main
│   │   │   │   │   │   └───lib
│   │   │   │   │   └───module
│   │   │   │   │       └───lib
│   │   │   │   └───src
│   │   │   │       └───lib
│   │   │   ├───storage-js
│   │   │   │   ├───dist
│   │   │   │   │   ├───main
│   │   │   │   │   │   ├───lib
│   │   │   │   │   │   └───packages
│   │   │   │   │   ├───module
│   │   │   │   │   │   ├───lib
│   │   │   │   │   │   └───packages
│   │   │   │   │   └───umd
│   │   │   │   └───src
│   │   │   │       ├───lib
│   │   │   │       └───packages
│   │   │   └───supabase-js
│   │   │       ├───dist
│   │   │       │   ├───main
│   │   │       │   │   └───lib
│   │   │       │   ├───module
│   │   │       │   │   └───lib
│   │   │       │   └───umd
│   │   │       └───src
│   │   │           └───lib
│   │   ├───@types
│   │   │   ├───node
│   │   │   │   ├───assert
│   │   │   │   ├───compatibility
│   │   │   │   ├───dns
│   │   │   │   ├───fs
│   │   │   │   ├───readline
│   │   │   │   ├───stream
│   │   │   │   ├───timers
│   │   │   │   └───ts5.6
│   │   │   ├───phoenix
│   │   │   └───ws
│   │   ├───abbrev
│   │   ├───accepts
│   │   ├───agent-base
│   │   │   ├───dist
│   │   │   │   └───src
│   │   │   └───src
│   │   ├───ansi-regex
│   │   ├───append-field
│   │   │   ├───lib
│   │   │   └───test
│   │   ├───aproba
│   │   ├───are-we-there-yet
│   │   │   ├───lib
│   │   │   └───node_modules
│   │   │       └───readable-stream
│   │   │           └───lib
│   │   │               └───internal
│   │   │                   └───streams
│   │   ├───array-flatten
│   │   ├───balanced-match
│   │   │   └───.github
│   │   ├───bcrypt
│   │   │   ├───.github
│   │   │   │   └───workflows
│   │   │   ├───examples
│   │   │   ├───lib
│   │   │   │   └───binding
│   │   │   │       └───napi-v3
│   │   │   ├───src
│   │   │   └───test
│   │   ├───body-parser
│   │   │   ├───lib
│   │   │   │   └───types
│   │   │   └───node_modules
│   │   │       ├───debug
│   │   │       │   └───src
│   │   │       └───ms
│   │   ├───brace-expansion
│   │   ├───buffer-equal-constant-time
│   │   ├───buffer-from
│   │   ├───busboy
│   │   │   ├───.github
│   │   │   │   └───workflows
│   │   │   ├───bench
│   │   │   ├───lib
│   │   │   │   └───types
│   │   │   └───test
│   │   ├───bytes
│   │   ├───call-bind-apply-helpers
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───call-bound
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───chownr
│   │   ├───color-support
│   │   ├───concat-map
│   │   │   ├───example
│   │   │   └───test
│   │   ├───concat-stream
│   │   ├───console-control-strings
│   │   ├───content-disposition
│   │   │   └───node_modules
│   │   │       └───safe-buffer
│   │   ├───content-type
│   │   ├───cookie
│   │   ├───cookie-parser
│   │   │   └───node_modules
│   │   │       └───cookie
│   │   ├───cookie-signature
│   │   ├───core-util-is
│   │   │   └───lib
│   │   ├───cors
│   │   │   └───lib
│   │   ├───debug
│   │   │   └───src
│   │   ├───delegates
│   │   │   └───test
│   │   ├───depd
│   │   │   └───lib
│   │   │       └───browser
│   │   ├───destroy
│   │   ├───detect-libc
│   │   │   └───lib
│   │   ├───dotenv
│   │   │   └───lib
│   │   ├───dunder-proto
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───ecdsa-sig-formatter
│   │   │   └───src
│   │   ├───ee-first
│   │   ├───emoji-regex
│   │   │   └───es2015
│   │   ├───encodeurl
│   │   ├───es-define-property
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───es-errors
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───es-object-atoms
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───escape-html
│   │   ├───etag
│   │   ├───express
│   │   │   ├───lib
│   │   │   │   ├───middleware
│   │   │   │   └───router
│   │   │   └───node_modules
│   │   │       ├───debug
│   │   │       │   └───src
│   │   │       ├───ms
│   │   │       └───safe-buffer
│   │   ├───finalhandler
│   │   │   └───node_modules
│   │   │       ├───debug
│   │   │       │   └───src
│   │   │       └───ms
│   │   ├───forwarded
│   │   ├───fresh
│   │   ├───fs
│   │   ├───fs-minipass
│   │   │   └───node_modules
│   │   │       └───minipass
│   │   ├───fs.realpath
│   │   ├───function-bind
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───gauge
│   │   ├───get-intrinsic
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───get-proto
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───glob
│   │   ├───gopd
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───has-symbols
│   │   │   ├───.github
│   │   │   └───test
│   │   │       └───shams
│   │   ├───has-unicode
│   │   ├───hasown
│   │   │   └───.github
│   │   ├───http-errors
│   │   ├───https-proxy-agent
│   │   │   └───dist
│   │   ├───iconv-lite
│   │   │   ├───encodings
│   │   │   │   └───tables
│   │   │   └───lib
│   │   ├───inflight
│   │   ├───inherits
│   │   ├───ipaddr.js
│   │   │   └───lib
│   │   ├───is-fullwidth-code-point
│   │   ├───isarray
│   │   ├───jsonwebtoken
│   │   │   └───lib
│   │   ├───jwa
│   │   ├───jws
│   │   │   └───lib
│   │   ├───lodash.includes
│   │   ├───lodash.isboolean
│   │   ├───lodash.isinteger
│   │   ├───lodash.isnumber
│   │   ├───lodash.isplainobject
│   │   ├───lodash.isstring
│   │   ├───lodash.once
│   │   ├───make-dir
│   │   │   └───node_modules
│   │   │       ├───.bin
│   │   │       └───semver
│   │   │           └───bin
│   │   ├───math-intrinsics
│   │   │   ├───.github
│   │   │   ├───constants
│   │   │   └───test
│   │   ├───media-typer
│   │   ├───merge-descriptors
│   │   ├───methods
│   │   ├───mime
│   │   │   └───src
│   │   ├───mime-db
│   │   ├───mime-types
│   │   ├───minimatch
│   │   ├───minimist
│   │   │   ├───.github
│   │   │   ├───example
│   │   │   └───test
│   │   ├───minipass
│   │   ├───minizlib
│   │   │   └───node_modules
│   │   │       └───minipass
│   │   ├───mkdirp
│   │   │   └───bin
│   │   ├───ms
│   │   ├───multer
│   │   │   ├───lib
│   │   │   └───storage
│   │   ├───negotiator
│   │   │   └───lib
│   │   ├───node-addon-api
│   │   │   └───tools
│   │   ├───node-fetch
│   │   │   └───lib
│   │   ├───nopt
│   │   │   ├───bin
│   │   │   └───lib
│   │   ├───npmlog
│   │   ├───object-assign
│   │   ├───object-inspect
│   │   │   ├───.github
│   │   │   ├───example
│   │   │   └───test
│   │   │       └───browser
│   │   ├───on-finished
│   │   ├───once
│   │   ├───parseurl
│   │   ├───path
│   │   ├───path-is-absolute
│   │   ├───path-to-regexp
│   │   ├───playwright
│   │   │   ├───lib
│   │   │   │   ├───common
│   │   │   │   ├───isomorphic
│   │   │   │   ├───loader
│   │   │   │   ├───matchers
│   │   │   │   ├───plugins
│   │   │   │   ├───reporters
│   │   │   │   │   └───versions
│   │   │   │   ├───runner
│   │   │   │   ├───third_party
│   │   │   │   ├───transform
│   │   │   │   └───worker
│   │   │   └───types
│   │   ├───playwright-core
│   │   │   ├───bin
│   │   │   ├───lib
│   │   │   │   ├───cli
│   │   │   │   ├───client
│   │   │   │   ├───generated
│   │   │   │   ├───protocol
│   │   │   │   ├───remote
│   │   │   │   ├───server
│   │   │   │   │   ├───android
│   │   │   │   │   ├───bidi
│   │   │   │   │   │   └───third_party
│   │   │   │   │   ├───chromium
│   │   │   │   │   ├───codegen
│   │   │   │   │   ├───dispatchers
│   │   │   │   │   ├───electron
│   │   │   │   │   ├───firefox
│   │   │   │   │   ├───har
│   │   │   │   │   ├───isomorphic
│   │   │   │   │   ├───recorder
│   │   │   │   │   ├───registry
│   │   │   │   │   ├───trace
│   │   │   │   │   │   ├───recorder
│   │   │   │   │   │   ├───test
│   │   │   │   │   │   └───viewer
│   │   │   │   │   ├───utils
│   │   │   │   │   │   └───image_tools
│   │   │   │   │   └───webkit
│   │   │   │   ├───third_party
│   │   │   │   ├───utils
│   │   │   │   │   └───isomorphic
│   │   │   │   ├───utilsBundleImpl
│   │   │   │   └───vite
│   │   │   │       ├───htmlReport
│   │   │   │       ├───recorder
│   │   │   │       │   └───assets
│   │   │   │       └───traceViewer
│   │   │   │           └───assets
│   │   │   └───types
│   │   ├───process
│   │   ├───process-nextick-args
│   │   ├───proxy-addr
│   │   ├───qs
│   │   │   ├───.github
│   │   │   ├───dist
│   │   │   ├───lib
│   │   │   └───test
│   │   ├───range-parser
│   │   ├───raw-body
│   │   ├───readable-stream
│   │   │   ├───doc
│   │   │   │   └───wg-meetings
│   │   │   └───lib
│   │   │       └───internal
│   │   │           └───streams
│   │   ├───rimraf
│   │   ├───safe-buffer
│   │   ├───safer-buffer
│   │   ├───semver
│   │   │   ├───bin
│   │   │   ├───classes
│   │   │   ├───functions
│   │   │   ├───internal
│   │   │   └───ranges
│   │   ├───send
│   │   │   └───node_modules
│   │   │       ├───debug
│   │   │       │   ├───node_modules
│   │   │       │   │   └───ms
│   │   │       │   └───src
│   │   │       └───encodeurl
│   │   ├───serve-static
│   │   ├───set-blocking
│   │   ├───setprototypeof
│   │   │   └───test
│   │   ├───side-channel
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───side-channel-list
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───side-channel-map
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───side-channel-weakmap
│   │   │   ├───.github
│   │   │   └───test
│   │   ├───signal-exit
│   │   ├───statuses
│   │   ├───streamsearch
│   │   │   ├───.github
│   │   │   │   └───workflows
│   │   │   ├───lib
│   │   │   └───test
│   │   ├───string-width
│   │   ├───string_decoder
│   │   │   └───lib
│   │   ├───strip-ansi
│   │   ├───tar
│   │   │   ├───lib
│   │   │   └───node_modules
│   │   │       ├───.bin
│   │   │       └───mkdirp
│   │   │           ├───bin
│   │   │           └───lib
│   │   ├───toidentifier
│   │   ├───tr46
│   │   │   └───lib
│   │   ├───type-is
│   │   ├───typedarray
│   │   │   ├───example
│   │   │   └───test
│   │   │       └───server
│   │   ├───undici-types
│   │   ├───unpipe
│   │   ├───util
│   │   │   ├───node_modules
│   │   │   │   └───inherits
│   │   │   └───support
│   │   ├───util-deprecate
│   │   ├───utils-merge
│   │   ├───vary
│   │   ├───webidl-conversions
│   │   │   └───lib
│   │   ├───whatwg-url
│   │   │   └───lib
│   │   ├───wide-align
│   │   ├───wrappy
│   │   ├───ws
│   │   │   └───lib
│   │   ├───xtend
│   │   └───yallist
│   ├───playwright-report
│   ├───src
│   │   ├───middleware
│   │   └───routes
│   ├───test-results
│   ├───tests
│   ├───tests-examples
│   └───uploads
└───frontend
    ├───.react-router
    │   └───types
    │       └───app
    │           ├───+types
    │           ├───layouts
    │           │   ├───DashboardLayoutClient
    │           │   │   └───+types
    │           │   └───DashboardLayoutVet
    │           │       └───+types
    │           └───routes
    │               ├───+types
    │               ├───DashboardClient
    │               │   └───+types
    │               ├───DashboardVet
    │               │   ├───+types
    │               │   ├───GeneralInformation
    │               │   │   └───+types
    │               │   ├───PhotosVet
    │               │   │   └───+types
    │               │   └───VetAnalytics
    │               │       └───+types
    │               ├───LoginPage
    │               │   └───+types
    │               └───Unauthorized
    │                   └───+types
    ├───app
    │   ├───components
    │   │   └───ui
    │   ├───layouts
    │   │   ├───DashboardLayoutClient
    │   │   └───DashboardLayoutVet
    │   ├───lib
    │   ├───resources
    │   │   └───images
    │   ├───routes
    │   │   ├───DashboardClient
    │   │   ├───DashboardVet
    │   │   │   ├───GeneralInformation
    │   │   │   ├───PhotosVet
    │   │   │   └───VetAnalytics
    │   │   ├───HomePage
    │   │   ├───LoginPage
    │   │   └───Unauthorized
    │   ├───stores
    │   ├───types
    │   ├───utils
    │   └───zodSchemas
    ├───node_modules
    │   ├───.bin
    │   ├───.vite
    │   │   └───deps
    │   ├───.vite-temp
    │   ├───@ampproject
    │   │   └───remapping
    │   │       └───dist
    │   │           └───types
    │   ├───@babel
    │   │   ├───code-frame
    │   │   │   └───lib
    │   │   ├───compat-data
    │   │   │   └───data
    │   │   ├───core
    │   │   │   ├───lib
    │   │   │   │   ├───config
    │   │   │   │   │   ├───files
    │   │   │   │   │   ├───helpers
    │   │   │   │   │   └───validation
    │   │   │   │   ├───errors
    │   │   │   │   ├───gensync-utils
    │   │   │   │   ├───parser
    │   │   │   │   │   └───util
    │   │   │   │   ├───tools
    │   │   │   │   ├───transformation
    │   │   │   │   │   ├───file
    │   │   │   │   │   └───util
    │   │   │   │   └───vendor
    │   │   │   ├───node_modules
    │   │   │   │   ├───.bin
    │   │   │   │   ├───convert-source-map
    │   │   │   │   └───semver
    │   │   │   │       └───bin
    │   │   │   └───src
    │   │   │       └───config
    │   │   │           └───files
    │   │   ├───generator
    │   │   │   └───lib
    │   │   │       ├───generators
    │   │   │       └───node
    │   │   ├───helper-annotate-as-pure
    │   │   │   └───lib
    │   │   ├───helper-compilation-targets
    │   │   │   ├───lib
    │   │   │   └───node_modules
    │   │   │       ├───.bin
    │   │   │       └───semver
    │   │   │           └───bin
    │   │   ├───helper-create-class-features-plugin
    │   │   │   ├───lib
    │   │   │   └───node_modules
    │   │   │       ├───.bin
    │   │   │       └───semver
    │   │   │           └───bin
    │   │   ├───helper-member-expression-to-functions
    │   │   │   └───lib
    │   │   ├───helper-module-imports
    │   │   │   └───lib
    │   │   ├───helper-module-transforms
    │   │   │   └───lib
    │   │   ├───helper-optimise-call-expression
    │   │   │   └───lib
    │   │   ├───helper-plugin-utils
    │   │   │   └───lib
    │   │   ├───helper-replace-supers
    │   │   │   └───lib
    │   │   ├───helper-skip-transparent-expression-wrappers
    │   │   │   └───lib
    │   │   ├───helper-string-parser
    │   │   │   └───lib
    │   │   ├───helper-validator-identifier
    │   │   │   └───lib
    │   │   ├───helper-validator-option
    │   │   │   └───lib
    │   │   ├───helpers
    │   │   │   └───lib
    │   │   │       └───helpers
    │   │   ├───parser
    │   │   │   ├───bin
    │   │   │   ├───lib
    │   │   │   └───typings
    │   │   ├───plugin-syntax-decorators
    │   │   │   └───lib
    │   │   ├───plugin-syntax-jsx
    │   │   │   └───lib
    │   │   ├───plugin-syntax-typescript
    │   │   │   └───lib
    │   │   ├───plugin-transform-modules-commonjs
    │   │   │   └───lib
    │   │   ├───plugin-transform-typescript
    │   │   │   └───lib
    │   │   ├───preset-typescript
    │   │   │   └───lib
    │   │   ├───runtime
    │   │   │   ├───helpers
    │   │   │   │   └───esm
    │   │   │   └───regenerator
    │   │   ├───template
    │   │   │   └───lib
    │   │   ├───traverse
    │   │   │   └───lib
    │   │   │       ├───path
    │   │   │       │   ├───inference
    │   │   │       │   └───lib
    │   │   │       └───scope
    │   │   │           └───lib
    │   │   └───types
    │   │       └───lib
    │   │           ├───asserts
    │   │           │   └───generated
    │   │           ├───ast-types
    │   │           │   └───generated
    │   │           ├───builders
    │   │           │   ├───flow
    │   │           │   ├───generated
    │   │           │   ├───react
    │   │           │   └───typescript
    │   │           ├───clone
    │   │           ├───comments
    │   │           ├───constants
    │   │           │   └───generated
    │   │           ├───converters
    │   │           ├───definitions
    │   │           ├───modifications
    │   │           │   ├───flow
    │   │           │   └───typescript
    │   │           ├───retrievers
    │   │           ├───traverse
    │   │           ├───utils
    │   │           │   └───react
    │   │           └───validators
    │   │               ├───generated
    │   │               └───react
    │   ├───@biomejs
    │   ├───@bkrem
    │   │   └───react-transition-group
    │   │       ├───dist
    │   │       └───utils
    │   ├───@emotion
    │   │   ├───babel-plugin
    │   │   │   ├───dist
    │   │   │   └───src
    │   │   │       └───utils
    │   │   ├───cache
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   │       └───conditions
    │   │   ├───css
    │   │   │   ├───create-instance
    │   │   │   │   └───dist
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   ├───src
    │   │   │   │   └───conditions
    │   │   │   └───types
    │   │   ├───hash
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   ├───is-prop-valid
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   ├───memoize
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   ├───react
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   ├───jsx-dev-runtime
    │   │   │   │   └───dist
    │   │   │   ├───jsx-runtime
    │   │   │   │   └───dist
    │   │   │   ├───src
    │   │   │   │   └───conditions
    │   │   │   ├───types
    │   │   │   └───_isolated-hnrs
    │   │   │       └───dist
    │   │   ├───serialize
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   │       └───conditions
    │   │   ├───sheet
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   │       └───conditions
    │   │   ├───styled
    │   │   │   ├───base
    │   │   │   │   └───dist
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   │       └───conditions
    │   │   ├───unitless
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   ├───use-insertion-effect-with-fallbacks
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   │       └───conditions
    │   │   ├───utils
    │   │   │   ├───dist
    │   │   │   │   └───declarations
    │   │   │   │       └───src
    │   │   │   └───src
    │   │   │       └───conditions
    │   │   └───weak-memoize
    │   │       ├───dist
    │   │       │   └───declarations
    │   │       │       └───src
    │   │       └───src
    │   ├───@esbuild
    │   │   └───win32-x64
    │   ├───@floating-ui
    │   │   ├───core
    │   │   │   └───dist
    │   │   ├───dom
    │   │   │   └───dist
    │   │   ├───react-dom
    │   │   │   └───dist
    │   │   └───utils
    │   │       ├───dist
    │   │       └───dom
    │   ├───@fontsource
    │   │   └───roboto
    │   │       ├───files
    │   │       └───scss
    │   ├───@hookform
    │   │   └───resolvers
    │   │       ├───ajv
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───arktype
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───class-validator
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───computed-types
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───dist
    │   │       ├───effect-ts
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───fluentvalidation-ts
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───io-ts
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───joi
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───nope
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───standard-schema
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───superstruct
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───typanion
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───typebox
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───typeschema
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───valibot
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───vest
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───vine
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       ├───yup
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       │       └───__tests__
    │   │       │           ├───__fixtures__
    │   │       │           └───__snapshots__
    │   │       └───zod
    │   │           ├───dist
    │   │           └───src
    │   │               └───__tests__
    │   │                   ├───__fixtures__
    │   │                   └───__snapshots__
    │   ├───@isaacs
    │   │   └───cliui
    │   │       └───build
    │   │           └───lib
    │   ├───@jridgewell
    │   │   ├───gen-mapping
    │   │   │   └───dist
    │   │   │       └───types
    │   │   ├───resolve-uri
    │   │   │   └───dist
    │   │   │       └───types
    │   │   ├───set-array
    │   │   │   └───dist
    │   │   │       └───types
    │   │   ├───sourcemap-codec
    │   │   │   └───dist
    │   │   │       └───types
    │   │   └───trace-mapping
    │   │       └───dist
    │   │           └───types
    │   ├───@mjackson
    │   │   └───node-fetch-server
    │   │       └───dist
    │   ├───@mui
    │   │   ├───core-downloads-tracker
    │   │   ├───icons-material
    │   │   │   ├───esm
    │   │   │   │   └───utils
    │   │   │   └───utils
    │   │   ├───material
    │   │   │   ├───Accordion
    │   │   │   ├───AccordionActions
    │   │   │   ├───AccordionDetails
    │   │   │   ├───AccordionSummary
    │   │   │   ├───Alert
    │   │   │   ├───AlertTitle
    │   │   │   ├───AppBar
    │   │   │   ├───Autocomplete
    │   │   │   ├───Avatar
    │   │   │   ├───AvatarGroup
    │   │   │   ├───Backdrop
    │   │   │   ├───Badge
    │   │   │   ├───BottomNavigation
    │   │   │   ├───BottomNavigationAction
    │   │   │   ├───Box
    │   │   │   ├───Breadcrumbs
    │   │   │   ├───Button
    │   │   │   ├───ButtonBase
    │   │   │   ├───ButtonGroup
    │   │   │   ├───Card
    │   │   │   ├───CardActionArea
    │   │   │   ├───CardActions
    │   │   │   ├───CardContent
    │   │   │   ├───CardHeader
    │   │   │   ├───CardMedia
    │   │   │   ├───Checkbox
    │   │   │   ├───Chip
    │   │   │   ├───CircularProgress
    │   │   │   ├───className
    │   │   │   ├───ClickAwayListener
    │   │   │   ├───Collapse
    │   │   │   ├───colors
    │   │   │   ├───Container
    │   │   │   ├───CssBaseline
    │   │   │   ├───darkScrollbar
    │   │   │   ├───DefaultPropsProvider
    │   │   │   ├───Dialog
    │   │   │   ├───DialogActions
    │   │   │   ├───DialogContent
    │   │   │   ├───DialogContentText
    │   │   │   ├───DialogTitle
    │   │   │   ├───Divider
    │   │   │   ├───Drawer
    │   │   │   ├───Fab
    │   │   │   ├───Fade
    │   │   │   ├───FilledInput
    │   │   │   ├───FormControl
    │   │   │   ├───FormControlLabel
    │   │   │   ├───FormGroup
    │   │   │   ├───FormHelperText
    │   │   │   ├───FormLabel
    │   │   │   ├───generateUtilityClass
    │   │   │   ├───generateUtilityClasses
    │   │   │   ├───GlobalStyles
    │   │   │   ├───Grid
    │   │   │   ├───Grid2
    │   │   │   ├───Grow
    │   │   │   ├───Hidden
    │   │   │   ├───Icon
    │   │   │   ├───IconButton
    │   │   │   ├───ImageList
    │   │   │   ├───ImageListItem
    │   │   │   ├───ImageListItemBar
    │   │   │   ├───InitColorSchemeScript
    │   │   │   ├───Input
    │   │   │   ├───InputAdornment
    │   │   │   ├───InputBase
    │   │   │   ├───InputLabel
    │   │   │   ├───internal
    │   │   │   │   └───svg-icons
    │   │   │   ├───LinearProgress
    │   │   │   ├───Link
    │   │   │   ├───List
    │   │   │   ├───ListItem
    │   │   │   ├───ListItemAvatar
    │   │   │   ├───ListItemButton
    │   │   │   ├───ListItemIcon
    │   │   │   ├───ListItemSecondaryAction
    │   │   │   ├───ListItemText
    │   │   │   ├───ListSubheader
    │   │   │   ├───locale
    │   │   │   ├───Menu
    │   │   │   ├───MenuItem
    │   │   │   ├───MenuList
    │   │   │   ├───MobileStepper
    │   │   │   ├───Modal
    │   │   │   ├───modern
    │   │   │   │   ├───Accordion
    │   │   │   │   ├───AccordionActions
    │   │   │   │   ├───AccordionDetails
    │   │   │   │   ├───AccordionSummary
    │   │   │   │   ├───Alert
    │   │   │   │   ├───AlertTitle
    │   │   │   │   ├───AppBar
    │   │   │   │   ├───Autocomplete
    │   │   │   │   ├───Avatar
    │   │   │   │   ├───AvatarGroup
    │   │   │   │   ├───Backdrop
    │   │   │   │   ├───Badge
    │   │   │   │   ├───BottomNavigation
    │   │   │   │   ├───BottomNavigationAction
    │   │   │   │   ├───Box
    │   │   │   │   ├───Breadcrumbs
    │   │   │   │   ├───Button
    │   │   │   │   ├───ButtonBase
    │   │   │   │   ├───ButtonGroup
    │   │   │   │   ├───Card
    │   │   │   │   ├───CardActionArea
    │   │   │   │   ├───CardActions
    │   │   │   │   ├───CardContent
    │   │   │   │   ├───CardHeader
    │   │   │   │   ├───CardMedia
    │   │   │   │   ├───Checkbox
    │   │   │   │   ├───Chip
    │   │   │   │   ├───CircularProgress
    │   │   │   │   ├───className
    │   │   │   │   ├───ClickAwayListener
    │   │   │   │   ├───Collapse
    │   │   │   │   ├───colors
    │   │   │   │   ├───Container
    │   │   │   │   ├───CssBaseline
    │   │   │   │   ├───darkScrollbar
    │   │   │   │   ├───DefaultPropsProvider
    │   │   │   │   ├───Dialog
    │   │   │   │   ├───DialogActions
    │   │   │   │   ├───DialogContent
    │   │   │   │   ├───DialogContentText
    │   │   │   │   ├───DialogTitle
    │   │   │   │   ├───Divider
    │   │   │   │   ├───Drawer
    │   │   │   │   ├───Fab
    │   │   │   │   ├───Fade
    │   │   │   │   ├───FilledInput
    │   │   │   │   ├───FormControl
    │   │   │   │   ├───FormControlLabel
    │   │   │   │   ├───FormGroup
    │   │   │   │   ├───FormHelperText
    │   │   │   │   ├───FormLabel
    │   │   │   │   ├───generateUtilityClass
    │   │   │   │   ├───generateUtilityClasses
    │   │   │   │   ├───GlobalStyles
    │   │   │   │   ├───Grid
    │   │   │   │   ├───Grid2
    │   │   │   │   ├───Grow
    │   │   │   │   ├───Hidden
    │   │   │   │   ├───Icon
    │   │   │   │   ├───IconButton
    │   │   │   │   ├───ImageList
    │   │   │   │   ├───ImageListItem
    │   │   │   │   ├───ImageListItemBar
    │   │   │   │   ├───InitColorSchemeScript
    │   │   │   │   ├───Input
    │   │   │   │   ├───InputAdornment
    │   │   │   │   ├───InputBase
    │   │   │   │   ├───InputLabel
    │   │   │   │   ├───internal
    │   │   │   │   │   └───svg-icons
    │   │   │   │   ├───LinearProgress
    │   │   │   │   ├───Link
    │   │   │   │   ├───List
    │   │   │   │   ├───ListItem
    │   │   │   │   ├───ListItemAvatar
    │   │   │   │   ├───ListItemButton
    │   │   │   │   ├───ListItemIcon
    │   │   │   │   ├───ListItemSecondaryAction
    │   │   │   │   ├───ListItemText
    │   │   │   │   ├───ListSubheader
    │   │   │   │   ├───locale
    │   │   │   │   ├───Menu
    │   │   │   │   ├───MenuItem
    │   │   │   │   ├───MenuList
    │   │   │   │   ├───MobileStepper
    │   │   │   │   ├───Modal
    │   │   │   │   ├───NativeSelect
    │   │   │   │   ├───NoSsr
    │   │   │   │   ├───OutlinedInput
    │   │   │   │   ├───OverridableComponent
    │   │   │   │   ├───Pagination
    │   │   │   │   ├───PaginationItem
    │   │   │   │   ├───Paper
    │   │   │   │   ├───PigmentContainer
    │   │   │   │   ├───PigmentGrid
    │   │   │   │   ├───PigmentHidden
    │   │   │   │   ├───PigmentStack
    │   │   │   │   ├───Popover
    │   │   │   │   ├───Popper
    │   │   │   │   ├───Portal
    │   │   │   │   ├───Radio
    │   │   │   │   ├───RadioGroup
    │   │   │   │   ├───Rating
    │   │   │   │   ├───ScopedCssBaseline
    │   │   │   │   ├───Select
    │   │   │   │   ├───Skeleton
    │   │   │   │   ├───Slide
    │   │   │   │   ├───Slider
    │   │   │   │   ├───Snackbar
    │   │   │   │   ├───SnackbarContent
    │   │   │   │   ├───SpeedDial
    │   │   │   │   ├───SpeedDialAction
    │   │   │   │   ├───SpeedDialIcon
    │   │   │   │   ├───Stack
    │   │   │   │   ├───Step
    │   │   │   │   ├───StepButton
    │   │   │   │   ├───StepConnector
    │   │   │   │   ├───StepContent
    │   │   │   │   ├───StepIcon
    │   │   │   │   ├───StepLabel
    │   │   │   │   ├───Stepper
    │   │   │   │   ├───StyledEngineProvider
    │   │   │   │   ├───styles
    │   │   │   │   ├───SvgIcon
    │   │   │   │   ├───SwipeableDrawer
    │   │   │   │   ├───Switch
    │   │   │   │   ├───Tab
    │   │   │   │   ├───Table
    │   │   │   │   ├───TableBody
    │   │   │   │   ├───TableCell
    │   │   │   │   ├───TableContainer
    │   │   │   │   ├───TableFooter
    │   │   │   │   ├───TableHead
    │   │   │   │   ├───TablePagination
    │   │   │   │   ├───TableRow
    │   │   │   │   ├───TableSortLabel
    │   │   │   │   ├───Tabs
    │   │   │   │   ├───TabScrollButton
    │   │   │   │   ├───TextareaAutosize
    │   │   │   │   ├───TextField
    │   │   │   │   ├───ToggleButton
    │   │   │   │   ├───ToggleButtonGroup
    │   │   │   │   ├───Toolbar
    │   │   │   │   ├───Tooltip
    │   │   │   │   ├───transitions
    │   │   │   │   ├───types
    │   │   │   │   ├───Typography
    │   │   │   │   ├───Unstable_TrapFocus
    │   │   │   │   ├───useAutocomplete
    │   │   │   │   ├───useLazyRipple
    │   │   │   │   ├───useMediaQuery
    │   │   │   │   ├───usePagination
    │   │   │   │   ├───useScrollTrigger
    │   │   │   │   ├───utils
    │   │   │   │   ├───version
    │   │   │   │   ├───zero-styled
    │   │   │   │   └───Zoom
    │   │   │   ├───NativeSelect
    │   │   │   ├───node
    │   │   │   │   ├───Accordion
    │   │   │   │   ├───AccordionActions
    │   │   │   │   ├───AccordionDetails
    │   │   │   │   ├───AccordionSummary
    │   │   │   │   ├───Alert
    │   │   │   │   ├───AlertTitle
    │   │   │   │   ├───AppBar
    │   │   │   │   ├───Autocomplete
    │   │   │   │   ├───Avatar
    │   │   │   │   ├───AvatarGroup
    │   │   │   │   ├───Backdrop
    │   │   │   │   ├───Badge
    │   │   │   │   ├───BottomNavigation
    │   │   │   │   ├───BottomNavigationAction
    │   │   │   │   ├───Box
    │   │   │   │   ├───Breadcrumbs
    │   │   │   │   ├───Button
    │   │   │   │   ├───ButtonBase
    │   │   │   │   ├───ButtonGroup
    │   │   │   │   ├───Card
    │   │   │   │   ├───CardActionArea
    │   │   │   │   ├───CardActions
    │   │   │   │   ├───CardContent
    │   │   │   │   ├───CardHeader
    │   │   │   │   ├───CardMedia
    │   │   │   │   ├───Checkbox
    │   │   │   │   ├───Chip
    │   │   │   │   ├───CircularProgress
    │   │   │   │   ├───className
    │   │   │   │   ├───ClickAwayListener
    │   │   │   │   ├───Collapse
    │   │   │   │   ├───colors
    │   │   │   │   ├───Container
    │   │   │   │   ├───CssBaseline
    │   │   │   │   ├───darkScrollbar
    │   │   │   │   ├───DefaultPropsProvider
    │   │   │   │   ├───Dialog
    │   │   │   │   ├───DialogActions
    │   │   │   │   ├───DialogContent
    │   │   │   │   ├───DialogContentText
    │   │   │   │   ├───DialogTitle
    │   │   │   │   ├───Divider
    │   │   │   │   ├───Drawer
    │   │   │   │   ├───Fab
    │   │   │   │   ├───Fade
    │   │   │   │   ├───FilledInput
    │   │   │   │   ├───FormControl
    │   │   │   │   ├───FormControlLabel
    │   │   │   │   ├───FormGroup
    │   │   │   │   ├───FormHelperText
    │   │   │   │   ├───FormLabel
    │   │   │   │   ├───generateUtilityClass
    │   │   │   │   ├───generateUtilityClasses
    │   │   │   │   ├───GlobalStyles
    │   │   │   │   ├───Grid
    │   │   │   │   ├───Grid2
    │   │   │   │   ├───Grow
    │   │   │   │   ├───Hidden
    │   │   │   │   ├───Icon
    │   │   │   │   ├───IconButton
    │   │   │   │   ├───ImageList
    │   │   │   │   ├───ImageListItem
    │   │   │   │   ├───ImageListItemBar
    │   │   │   │   ├───InitColorSchemeScript
    │   │   │   │   ├───Input
    │   │   │   │   ├───InputAdornment
    │   │   │   │   ├───InputBase
    │   │   │   │   ├───InputLabel
    │   │   │   │   ├───internal
    │   │   │   │   │   └───svg-icons
    │   │   │   │   ├───LinearProgress
    │   │   │   │   ├───Link
    │   │   │   │   ├───List
    │   │   │   │   ├───ListItem
    │   │   │   │   ├───ListItemAvatar
    │   │   │   │   ├───ListItemButton
    │   │   │   │   ├───ListItemIcon
    │   │   │   │   ├───ListItemSecondaryAction
    │   │   │   │   ├───ListItemText
    │   │   │   │   ├───ListSubheader
    │   │   │   │   ├───locale
    │   │   │   │   ├───Menu
    │   │   │   │   ├───MenuItem
    │   │   │   │   ├───MenuList
    │   │   │   │   ├───MobileStepper
    │   │   │   │   ├───Modal
    │   │   │   │   ├───NativeSelect
    │   │   │   │   ├───NoSsr
    │   │   │   │   ├───OutlinedInput
    │   │   │   │   ├───OverridableComponent
    │   │   │   │   ├───Pagination
    │   │   │   │   ├───PaginationItem
    │   │   │   │   ├───Paper
    │   │   │   │   ├───PigmentContainer
    │   │   │   │   ├───PigmentGrid
    │   │   │   │   ├───PigmentHidden
    │   │   │   │   ├───PigmentStack
    │   │   │   │   ├───Popover
    │   │   │   │   ├───Popper
    │   │   │   │   ├───Portal
    │   │   │   │   ├───Radio
    │   │   │   │   ├───RadioGroup
    │   │   │   │   ├───Rating
    │   │   │   │   ├───ScopedCssBaseline
    │   │   │   │   ├───Select
    │   │   │   │   ├───Skeleton
    │   │   │   │   ├───Slide
    │   │   │   │   ├───Slider
    │   │   │   │   ├───Snackbar
    │   │   │   │   ├───SnackbarContent
    │   │   │   │   ├───SpeedDial
    │   │   │   │   ├───SpeedDialAction
    │   │   │   │   ├───SpeedDialIcon
    │   │   │   │   ├───Stack
    │   │   │   │   ├───Step
    │   │   │   │   ├───StepButton
    │   │   │   │   ├───StepConnector
    │   │   │   │   ├───StepContent
    │   │   │   │   ├───StepIcon
    │   │   │   │   ├───StepLabel
    │   │   │   │   ├───Stepper
    │   │   │   │   ├───StyledEngineProvider
    │   │   │   │   ├───styles
    │   │   │   │   ├───SvgIcon
    │   │   │   │   ├───SwipeableDrawer
    │   │   │   │   ├───Switch
    │   │   │   │   ├───Tab
    │   │   │   │   ├───Table
    │   │   │   │   ├───TableBody
    │   │   │   │   ├───TableCell
    │   │   │   │   ├───TableContainer
    │   │   │   │   ├───TableFooter
    │   │   │   │   ├───TableHead
    │   │   │   │   ├───TablePagination
    │   │   │   │   ├───TableRow
    │   │   │   │   ├───TableSortLabel
    │   │   │   │   ├───Tabs
    │   │   │   │   ├───TabScrollButton
    │   │   │   │   ├───TextareaAutosize
    │   │   │   │   ├───TextField
    │   │   │   │   ├───ToggleButton
    │   │   │   │   ├───ToggleButtonGroup
    │   │   │   │   ├───Toolbar
    │   │   │   │   ├───Tooltip
    │   │   │   │   ├───transitions
    │   │   │   │   ├───types
    │   │   │   │   ├───Typography
    │   │   │   │   ├───Unstable_TrapFocus
    │   │   │   │   ├───useAutocomplete
    │   │   │   │   ├───useLazyRipple
    │   │   │   │   ├───useMediaQuery
    │   │   │   │   ├───usePagination
    │   │   │   │   ├───useScrollTrigger
    │   │   │   │   ├───utils
    │   │   │   │   ├───version
    │   │   │   │   ├───zero-styled
    │   │   │   │   └───Zoom
    │   │   │   ├───NoSsr
    │   │   │   ├───OutlinedInput
    │   │   │   ├───OverridableComponent
    │   │   │   ├───Pagination
    │   │   │   ├───PaginationItem
    │   │   │   ├───Paper
    │   │   │   ├───PigmentContainer
    │   │   │   ├───PigmentGrid
    │   │   │   ├───PigmentHidden
    │   │   │   ├───PigmentStack
    │   │   │   ├───Popover
    │   │   │   ├───Popper
    │   │   │   ├───Portal
    │   │   │   ├───Radio
    │   │   │   ├───RadioGroup
    │   │   │   ├───Rating
    │   │   │   ├───ScopedCssBaseline
    │   │   │   ├───Select
    │   │   │   ├───Skeleton
    │   │   │   ├───Slide
    │   │   │   ├───Slider
    │   │   │   ├───Snackbar
    │   │   │   ├───SnackbarContent
    │   │   │   ├───SpeedDial
    │   │   │   ├───SpeedDialAction
    │   │   │   ├───SpeedDialIcon
    │   │   │   ├───Stack
    │   │   │   ├───Step
    │   │   │   ├───StepButton
    │   │   │   ├───StepConnector
    │   │   │   ├───StepContent
    │   │   │   ├───StepIcon
    │   │   │   ├───StepLabel
    │   │   │   ├───Stepper
    │   │   │   ├───StyledEngineProvider
    │   │   │   ├───styles
    │   │   │   ├───SvgIcon
    │   │   │   ├───SwipeableDrawer
    │   │   │   ├───Switch
    │   │   │   ├───Tab
    │   │   │   ├───Table
    │   │   │   ├───TableBody
    │   │   │   ├───TableCell
    │   │   │   ├───TableContainer
    │   │   │   ├───TableFooter
    │   │   │   ├───TableHead
    │   │   │   ├───TablePagination
    │   │   │   ├───TableRow
    │   │   │   ├───TableSortLabel
    │   │   │   ├───Tabs
    │   │   │   ├───TabScrollButton
    │   │   │   ├───TextareaAutosize
    │   │   │   ├───TextField
    │   │   │   ├───themeCssVarsAugmentation
    │   │   │   ├───ToggleButton
    │   │   │   ├───ToggleButtonGroup
    │   │   │   ├───Toolbar
    │   │   │   ├───Tooltip
    │   │   │   ├───transitions
    │   │   │   ├───types
    │   │   │   ├───Typography
    │   │   │   ├───Unstable_TrapFocus
    │   │   │   ├───useAutocomplete
    │   │   │   ├───useLazyRipple
    │   │   │   ├───useMediaQuery
    │   │   │   ├───usePagination
    │   │   │   ├───useScrollTrigger
    │   │   │   ├───utils
    │   │   │   ├───version
    │   │   │   ├───zero-styled
    │   │   │   └───Zoom
    │   │   ├───private-theming
    │   │   │   ├───defaultTheme
    │   │   │   ├───modern
    │   │   │   │   ├───ThemeProvider
    │   │   │   │   └───useTheme
    │   │   │   ├───node
    │   │   │   │   ├───ThemeProvider
    │   │   │   │   └───useTheme
    │   │   │   ├───ThemeProvider
    │   │   │   └───useTheme
    │   │   ├───styled-engine
    │   │   │   ├───GlobalStyles
    │   │   │   ├───modern
    │   │   │   │   ├───GlobalStyles
    │   │   │   │   └───StyledEngineProvider
    │   │   │   ├───node
    │   │   │   │   ├───GlobalStyles
    │   │   │   │   └───StyledEngineProvider
    │   │   │   └───StyledEngineProvider
    │   │   ├───system
    │   │   │   ├───borders
    │   │   │   ├───Box
    │   │   │   ├───breakpoints
    │   │   │   ├───colorManipulator
    │   │   │   ├───compose
    │   │   │   ├───Container
    │   │   │   ├───createBox
    │   │   │   ├───createBreakpoints
    │   │   │   ├───createStyled
    │   │   │   ├───createTheme
    │   │   │   ├───cssContainerQueries
    │   │   │   ├───cssGrid
    │   │   │   ├───cssVars
    │   │   │   ├───DefaultPropsProvider
    │   │   │   ├───display
    │   │   │   ├───esm
    │   │   │   │   ├───borders
    │   │   │   │   ├───Box
    │   │   │   │   ├───breakpoints
    │   │   │   │   ├───colorManipulator
    │   │   │   │   ├───compose
    │   │   │   │   ├───Container
    │   │   │   │   ├───createBox
    │   │   │   │   ├───createBreakpoints
    │   │   │   │   ├───createStyled
    │   │   │   │   ├───createTheme
    │   │   │   │   ├───cssContainerQueries
    │   │   │   │   ├───cssGrid
    │   │   │   │   ├───cssVars
    │   │   │   │   ├───DefaultPropsProvider
    │   │   │   │   ├───display
    │   │   │   │   ├───flexbox
    │   │   │   │   ├───getThemeValue
    │   │   │   │   ├───GlobalStyles
    │   │   │   │   ├───Grid
    │   │   │   │   ├───InitColorSchemeScript
    │   │   │   │   ├───memoize
    │   │   │   │   ├───merge
    │   │   │   │   ├───palette
    │   │   │   │   ├───positions
    │   │   │   │   ├───propsToClassKey
    │   │   │   │   ├───responsivePropType
    │   │   │   │   ├───RtlProvider
    │   │   │   │   ├───shadows
    │   │   │   │   ├───sizing
    │   │   │   │   ├───spacing
    │   │   │   │   ├───Stack
    │   │   │   │   ├───style
    │   │   │   │   ├───styled
    │   │   │   │   ├───styleFunctionSx
    │   │   │   │   ├───ThemeProvider
    │   │   │   │   ├───typography
    │   │   │   │   ├───useMediaQuery
    │   │   │   │   ├───useTheme
    │   │   │   │   ├───useThemeProps
    │   │   │   │   ├───useThemeWithoutDefault
    │   │   │   │   └───version
    │   │   │   ├───flexbox
    │   │   │   ├───getThemeValue
    │   │   │   ├───GlobalStyles
    │   │   │   ├───Grid
    │   │   │   ├───InitColorSchemeScript
    │   │   │   ├───memoize
    │   │   │   ├───merge
    │   │   │   ├───modern
    │   │   │   │   ├───borders
    │   │   │   │   ├───Box
    │   │   │   │   ├───breakpoints
    │   │   │   │   ├───colorManipulator
    │   │   │   │   ├───compose
    │   │   │   │   ├───Container
    │   │   │   │   ├───createBox
    │   │   │   │   ├───createBreakpoints
    │   │   │   │   ├───createStyled
    │   │   │   │   ├───createTheme
    │   │   │   │   ├───cssContainerQueries
    │   │   │   │   ├───cssGrid
    │   │   │   │   ├───cssVars
    │   │   │   │   ├───DefaultPropsProvider
    │   │   │   │   ├───display
    │   │   │   │   ├───flexbox
    │   │   │   │   ├───getThemeValue
    │   │   │   │   ├───GlobalStyles
    │   │   │   │   ├───Grid
    │   │   │   │   ├───InitColorSchemeScript
    │   │   │   │   ├───memoize
    │   │   │   │   ├───merge
    │   │   │   │   ├───palette
    │   │   │   │   ├───positions
    │   │   │   │   ├───propsToClassKey
    │   │   │   │   ├───responsivePropType
    │   │   │   │   ├───RtlProvider
    │   │   │   │   ├───shadows
    │   │   │   │   ├───sizing
    │   │   │   │   ├───spacing
    │   │   │   │   ├───Stack
    │   │   │   │   ├───style
    │   │   │   │   ├───styled
    │   │   │   │   ├───styleFunctionSx
    │   │   │   │   ├───ThemeProvider
    │   │   │   │   ├───typography
    │   │   │   │   ├───useMediaQuery
    │   │   │   │   ├───useTheme
    │   │   │   │   ├───useThemeProps
    │   │   │   │   ├───useThemeWithoutDefault
    │   │   │   │   └───version
    │   │   │   ├───palette
    │   │   │   ├───positions
    │   │   │   ├───propsToClassKey
    │   │   │   ├───responsivePropType
    │   │   │   ├───RtlProvider
    │   │   │   ├───shadows
    │   │   │   ├───sizing
    │   │   │   ├───spacing
    │   │   │   ├───Stack
    │   │   │   ├───style
    │   │   │   ├───styled
    │   │   │   ├───styleFunctionSx
    │   │   │   ├───ThemeProvider
    │   │   │   ├───typography
    │   │   │   ├───useMediaQuery
    │   │   │   ├───useTheme
    │   │   │   ├───useThemeProps
    │   │   │   ├───useThemeWithoutDefault
    │   │   │   └───version
    │   │   ├───types
    │   │   └───utils
    │   │       ├───appendOwnerState
    │   │       ├───capitalize
    │   │       ├───chainPropTypes
    │   │       ├───clamp
    │   │       ├───ClassNameGenerator
    │   │       ├───composeClasses
    │   │       ├───createChainedFunction
    │   │       ├───debounce
    │   │       ├───deepmerge
    │   │       ├───deprecatedPropType
    │   │       ├───elementAcceptingRef
    │   │       ├───elementTypeAcceptingRef
    │   │       ├───esm
    │   │       │   ├───appendOwnerState
    │   │       │   ├───capitalize
    │   │       │   ├───chainPropTypes
    │   │       │   ├───clamp
    │   │       │   ├───ClassNameGenerator
    │   │       │   ├───composeClasses
    │   │       │   ├───createChainedFunction
    │   │       │   ├───debounce
    │   │       │   ├───deepmerge
    │   │       │   ├───deprecatedPropType
    │   │       │   ├───elementAcceptingRef
    │   │       │   ├───elementTypeAcceptingRef
    │   │       │   ├───exactProp
    │   │       │   ├───extractEventHandlers
    │   │       │   ├───formatMuiErrorMessage
    │   │       │   ├───generateUtilityClass
    │   │       │   ├───generateUtilityClasses
    │   │       │   ├───getDisplayName
    │   │       │   ├───getReactElementRef
    │   │       │   ├───getReactNodeRef
    │   │       │   ├───getScrollbarSize
    │   │       │   ├───getValidReactChildren
    │   │       │   ├───HTMLElementType
    │   │       │   ├───integerPropType
    │   │       │   ├───isFocusVisible
    │   │       │   ├───isHostComponent
    │   │       │   ├───isMuiElement
    │   │       │   ├───mergeSlotProps
    │   │       │   ├───omitEventHandlers
    │   │       │   ├───ownerDocument
    │   │       │   ├───ownerWindow
    │   │       │   ├───ponyfillGlobal
    │   │       │   ├───refType
    │   │       │   ├───requirePropFactory
    │   │       │   ├───resolveComponentProps
    │   │       │   ├───resolveProps
    │   │       │   ├───setRef
    │   │       │   ├───unsupportedProp
    │   │       │   ├───useControlled
    │   │       │   ├───useEnhancedEffect
    │   │       │   ├───useEventCallback
    │   │       │   ├───useForkRef
    │   │       │   ├───useId
    │   │       │   ├───useIsFocusVisible
    │   │       │   ├───useLazyRef
    │   │       │   ├───useLocalStorageState
    │   │       │   ├───useOnMount
    │   │       │   ├───usePreviousProps
    │   │       │   ├───useSlotProps
    │   │       │   ├───useTimeout
    │   │       │   └───visuallyHidden
    │   │       ├───exactProp
    │   │       ├───extractEventHandlers
    │   │       ├───formatMuiErrorMessage
    │   │       ├───generateUtilityClass
    │   │       ├───generateUtilityClasses
    │   │       ├───getDisplayName
    │   │       ├───getReactElementRef
    │   │       ├───getReactNodeRef
    │   │       ├───getScrollbarSize
    │   │       ├───getValidReactChildren
    │   │       ├───HTMLElementType
    │   │       ├───integerPropType
    │   │       ├───isFocusVisible
    │   │       ├───isHostComponent
    │   │       ├───isMuiElement
    │   │       ├───mergeSlotProps
    │   │       ├───modern
    │   │       │   ├───appendOwnerState
    │   │       │   ├───capitalize
    │   │       │   ├───chainPropTypes
    │   │       │   ├───clamp
    │   │       │   ├───ClassNameGenerator
    │   │       │   ├───composeClasses
    │   │       │   ├───createChainedFunction
    │   │       │   ├───debounce
    │   │       │   ├───deepmerge
    │   │       │   ├───deprecatedPropType
    │   │       │   ├───elementAcceptingRef
    │   │       │   ├───elementTypeAcceptingRef
    │   │       │   ├───exactProp
    │   │       │   ├───extractEventHandlers
    │   │       │   ├───formatMuiErrorMessage
    │   │       │   ├───generateUtilityClass
    │   │       │   ├───generateUtilityClasses
    │   │       │   ├───getDisplayName
    │   │       │   ├───getReactElementRef
    │   │       │   ├───getReactNodeRef
    │   │       │   ├───getScrollbarSize
    │   │       │   ├───getValidReactChildren
    │   │       │   ├───HTMLElementType
    │   │       │   ├───integerPropType
    │   │       │   ├───isFocusVisible
    │   │       │   ├───isHostComponent
    │   │       │   ├───isMuiElement
    │   │       │   ├───mergeSlotProps
    │   │       │   ├───omitEventHandlers
    │   │       │   ├───ownerDocument
    │   │       │   ├───ownerWindow
    │   │       │   ├───ponyfillGlobal
    │   │       │   ├───refType
    │   │       │   ├───requirePropFactory
    │   │       │   ├───resolveComponentProps
    │   │       │   ├───resolveProps
    │   │       │   ├───setRef
    │   │       │   ├───unsupportedProp
    │   │       │   ├───useControlled
    │   │       │   ├───useEnhancedEffect
    │   │       │   ├───useEventCallback
    │   │       │   ├───useForkRef
    │   │       │   ├───useId
    │   │       │   ├───useIsFocusVisible
    │   │       │   ├───useLazyRef
    │   │       │   ├───useLocalStorageState
    │   │       │   ├───useOnMount
    │   │       │   ├───usePreviousProps
    │   │       │   ├───useSlotProps
    │   │       │   ├───useTimeout
    │   │       │   └───visuallyHidden
    │   │       ├───omitEventHandlers
    │   │       ├───ownerDocument
    │   │       ├───ownerWindow
    │   │       ├───ponyfillGlobal
    │   │       ├───refType
    │   │       ├───requirePropFactory
    │   │       ├───resolveComponentProps
    │   │       ├───resolveProps
    │   │       ├───setRef
    │   │       ├───unsupportedProp
    │   │       ├───useControlled
    │   │       ├───useEnhancedEffect
    │   │       ├───useEventCallback
    │   │       ├───useForkRef
    │   │       ├───useId
    │   │       ├───useIsFocusVisible
    │   │       ├───useLazyRef
    │   │       ├───useLocalStorageState
    │   │       ├───useOnMount
    │   │       ├───usePreviousProps
    │   │       ├───useSlotProps
    │   │       ├───useTimeout
    │   │       └───visuallyHidden
    │   ├───@npmcli
    │   │   ├───git
    │   │   │   ├───lib
    │   │   │   └───node_modules
    │   │   │       └───lru-cache
    │   │   ├───package-json
    │   │   │   └───lib
    │   │   └───promise-spawn
    │   │       └───lib
    │   ├───@one-ini
    │   │   └───wasm
    │   ├───@pkgjs
    │   │   └───parseargs
    │   │       ├───examples
    │   │       └───internal
    │   ├───@popperjs
    │   │   └───core
    │   │       ├───dist
    │   │       │   ├───cjs
    │   │       │   ├───esm
    │   │       │   │   ├───dom-utils
    │   │       │   │   ├───modifiers
    │   │       │   │   └───utils
    │   │       │   └───umd
    │   │       └───lib
    │   │           ├───dom-utils
    │   │           ├───modifiers
    │   │           └───utils
    │   ├───@radix-ui
    │   │   ├───number
    │   │   │   └───dist
    │   │   ├───primitive
    │   │   │   └───dist
    │   │   ├───react-accordion
    │   │   │   └───dist
    │   │   ├───react-arrow
    │   │   │   └───dist
    │   │   ├───react-avatar
    │   │   │   └───dist
    │   │   ├───react-checkbox
    │   │   │   └───dist
    │   │   ├───react-collapsible
    │   │   │   └───dist
    │   │   ├───react-collection
    │   │   │   └───dist
    │   │   ├───react-compose-refs
    │   │   │   └───dist
    │   │   ├───react-context
    │   │   │   └───dist
    │   │   ├───react-dialog
    │   │   │   └───dist
    │   │   ├───react-direction
    │   │   │   └───dist
    │   │   ├───react-dismissable-layer
    │   │   │   └───dist
    │   │   ├───react-focus-guards
    │   │   │   └───dist
    │   │   ├───react-focus-scope
    │   │   │   └───dist
    │   │   ├───react-id
    │   │   │   └───dist
    │   │   ├───react-label
    │   │   │   └───dist
    │   │   ├───react-popover
    │   │   │   └───dist
    │   │   ├───react-popper
    │   │   │   └───dist
    │   │   ├───react-portal
    │   │   │   └───dist
    │   │   ├───react-presence
    │   │   │   └───dist
    │   │   ├───react-primitive
    │   │   │   └───dist
    │   │   ├───react-radio-group
    │   │   │   └───dist
    │   │   ├───react-roving-focus
    │   │   │   └───dist
    │   │   ├───react-scroll-area
    │   │   │   └───dist
    │   │   ├───react-select
    │   │   │   └───dist
    │   │   ├───react-slider
    │   │   │   └───dist
    │   │   ├───react-slot
    │   │   │   └───dist
    │   │   ├───react-switch
    │   │   │   └───dist
    │   │   ├───react-tabs
    │   │   │   └───dist
    │   │   ├───react-tooltip
    │   │   │   └───dist
    │   │   ├───react-use-callback-ref
    │   │   │   └───dist
    │   │   ├───react-use-controllable-state
    │   │   │   └───dist
    │   │   ├───react-use-escape-keydown
    │   │   │   └───dist
    │   │   ├───react-use-layout-effect
    │   │   │   └───dist
    │   │   ├───react-use-previous
    │   │   │   └───dist
    │   │   ├───react-use-rect
    │   │   │   └───dist
    │   │   ├───react-use-size
    │   │   │   └───dist
    │   │   ├───react-visually-hidden
    │   │   │   └───dist
    │   │   └───rect
    │   │       └───dist
    │   ├───@react-router
    │   │   ├───dev
    │   │   │   ├───dist
    │   │   │   │   ├───cli
    │   │   │   │   ├───config
    │   │   │   │   │   └───defaults
    │   │   │   │   ├───static
    │   │   │   │   └───vite
    │   │   │   ├───module-sync-enabled
    │   │   │   └───node_modules
    │   │   │       ├───.bin
    │   │   │       └───jsesc
    │   │   │           ├───bin
    │   │   │           └───man
    │   │   ├───express
    │   │   │   └───dist
    │   │   ├───node
    │   │   │   └───dist
    │   │   └───serve
    │   │       └───dist
    │   ├───@rollup
    │   │   └───rollup-win32-x64-msvc
    │   ├───@standard-schema
    │   │   └───utils
    │   │       └───dist
    │   ├───@tailwindcss
    │   │   ├───node
    │   │   │   └───dist
    │   │   ├───oxide
    │   │   ├───oxide-win32-x64-msvc
    │   │   └───vite
    │   │       └───dist
    │   ├───@types
    │   │   ├───cookie
    │   │   ├───d3-array
    │   │   ├───d3-color
    │   │   ├───d3-ease
    │   │   ├───d3-hierarchy
    │   │   ├───d3-interpolate
    │   │   ├───d3-path
    │   │   ├───d3-scale
    │   │   ├───d3-shape
    │   │   ├───d3-time
    │   │   ├───d3-timer
    │   │   ├───estree
    │   │   ├───js-cookie
    │   │   ├───node
    │   │   │   ├───assert
    │   │   │   ├───compatibility
    │   │   │   ├───dns
    │   │   │   ├───fs
    │   │   │   ├───readline
    │   │   │   ├───stream
    │   │   │   ├───timers
    │   │   │   └───ts5.6
    │   │   ├───parse-json
    │   │   ├───prop-types
    │   │   ├───react
    │   │   │   └───ts5.0
    │   │   │       └───v18
    │   │   │           └───ts5.0
    │   │   ├───react-dom
    │   │   │   └───test-utils
    │   │   ├───react-reconciler
    │   │   └───react-transition-group
    │   ├───abbrev
    │   │   └───lib
    │   ├───accepts
    │   │   └───node_modules
    │   │       └───negotiator
    │   │           └───lib
    │   ├───ansi-regex
    │   ├───ansi-styles
    │   ├───arg
    │   ├───aria-hidden
    │   │   └───dist
    │   │       ├───es2015
    │   │       ├───es2019
    │   │       └───es5
    │   ├───array-flatten
    │   ├───babel-dead-code-elimination
    │   │   └───dist
    │   ├───babel-plugin-macros
    │   │   └───dist
    │   ├───balanced-match
    │   │   └───.github
    │   ├───basic-auth
    │   │   └───node_modules
    │   │       └───safe-buffer
    │   ├───beautify
    │   │   ├───bin
    │   │   └───test
    │   │       ├───mock
    │   │       ├───mock2
    │   │       └───test2
    │   ├───bippy
    │   │   └───dist
    │   │       └───experiments
    │   ├───body-parser
    │   │   ├───lib
    │   │   │   └───types
    │   │   └───node_modules
    │   │       ├───debug
    │   │       │   └───src
    │   │       └───ms
    │   ├───brace-expansion
    │   │   └───.github
    │   ├───browserslist
    │   ├───buffer-from
    │   ├───bytes
    │   ├───cac
    │   │   ├───deno
    │   │   └───dist
    │   ├───call-bind-apply-helpers
    │   │   ├───.github
    │   │   └───test
    │   ├───call-bound
    │   │   ├───.github
    │   │   └───test
    │   ├───callsites
    │   ├───caniuse-lite
    │   │   ├───data
    │   │   │   ├───features
    │   │   │   └───regions
    │   │   └───dist
    │   │       ├───lib
    │   │       └───unpacker
    │   ├───chain-function
    │   ├───chalk
    │   │   └───source
    │   │       └───vendor
    │   │           ├───ansi-styles
    │   │           └───supports-color
    │   ├───chokidar
    │   │   └───esm
    │   ├───class-variance-authority
    │   │   └───dist
    │   ├───classnames
    │   ├───clone
    │   ├───clsx
    │   │   └───dist
    │   ├───color-convert
    │   ├───color-name
    │   ├───commander
    │   │   ├───lib
    │   │   └───typings
    │   ├───compressible
    │   ├───compression
    │   │   └───node_modules
    │   │       ├───debug
    │   │       │   └───src
    │   │       └───ms
    │   ├───concat-stream
    │   ├───config-chain
    │   ├───content-disposition
    │   ├───content-type
    │   ├───convert-source-map
    │   ├───cookie
    │   ├───cookie-signature
    │   ├───core-util-is
    │   │   └───lib
    │   ├───cosmiconfig
    │   │   └───dist
    │   ├───cross-spawn
    │   │   ├───lib
    │   │   │   └───util
    │   │   └───node_modules
    │   │       ├───.bin
    │   │       └───which
    │   │           └───bin
    │   ├───cssbeautify
    │   │   └───bin
    │   ├───csstype
    │   ├───d3-array
    │   │   ├───dist
    │   │   └───src
    │   │       └───threshold
    │   ├───d3-color
    │   │   ├───dist
    │   │   └───src
    │   ├───d3-dispatch
    │   │   ├───dist
    │   │   └───src
    │   ├───d3-drag
    │   │   ├───dist
    │   │   └───src
    │   ├───d3-ease
    │   │   ├───dist
    │   │   └───src
    │   ├───d3-format
    │   │   ├───dist
    │   │   ├───locale
    │   │   └───src
    │   ├───d3-hierarchy
    │   │   ├───dist
    │   │   └───src
    │   │       ├───hierarchy
    │   │       ├───pack
    │   │       └───treemap
    │   ├───d3-interpolate
    │   │   ├───dist
    │   │   └───src
    │   │       └───transform
    │   ├───d3-path
    │   │   ├───dist
    │   │   └───src
    │   ├───d3-scale
    │   │   ├───dist
    │   │   └───src
    │   ├───d3-selection
    │   │   ├───dist
    │   │   └───src
    │   │       └───selection
    │   ├───d3-shape
    │   │   ├───dist
    │   │   └───src
    │   │       ├───curve
    │   │       ├───link
    │   │       ├───offset
    │   │       ├───order
    │   │       └───symbol
    │   ├───d3-time
    │   │   ├───dist
    │   │   └───src
    │   ├───d3-time-format
    │   │   ├───dist
    │   │   ├───locale
    │   │   └───src
    │   ├───d3-timer
    │   │   ├───dist
    │   │   └───src
    │   ├───d3-transition
    │   │   ├───dist
    │   │   └───src
    │   │       ├───selection
    │   │       └───transition
    │   ├───d3-zoom
    │   │   ├───dist
    │   │   └───src
    │   ├───date-fns
    │   │   ├───docs
    │   │   ├───fp
    │   │   │   └───_lib
    │   │   ├───locale
    │   │   │   ├───af
    │   │   │   │   └───_lib
    │   │   │   ├───ar
    │   │   │   │   └───_lib
    │   │   │   ├───ar-DZ
    │   │   │   │   └───_lib
    │   │   │   ├───ar-EG
    │   │   │   │   └───_lib
    │   │   │   ├───ar-MA
    │   │   │   │   └───_lib
    │   │   │   ├───ar-SA
    │   │   │   │   └───_lib
    │   │   │   ├───ar-TN
    │   │   │   │   └───_lib
    │   │   │   ├───az
    │   │   │   │   └───_lib
    │   │   │   ├───be
    │   │   │   │   └───_lib
    │   │   │   ├───be-tarask
    │   │   │   │   └───_lib
    │   │   │   ├───bg
    │   │   │   │   └───_lib
    │   │   │   ├───bn
    │   │   │   │   └───_lib
    │   │   │   ├───bs
    │   │   │   │   └───_lib
    │   │   │   ├───ca
    │   │   │   │   └───_lib
    │   │   │   ├───ckb
    │   │   │   │   └───_lib
    │   │   │   ├───cs
    │   │   │   │   └───_lib
    │   │   │   ├───cy
    │   │   │   │   └───_lib
    │   │   │   ├───da
    │   │   │   │   └───_lib
    │   │   │   ├───de
    │   │   │   │   └───_lib
    │   │   │   ├───de-AT
    │   │   │   │   └───_lib
    │   │   │   ├───el
    │   │   │   │   └───_lib
    │   │   │   ├───en-AU
    │   │   │   │   └───_lib
    │   │   │   ├───en-CA
    │   │   │   │   └───_lib
    │   │   │   ├───en-GB
    │   │   │   │   └───_lib
    │   │   │   ├───en-IE
    │   │   │   ├───en-IN
    │   │   │   │   └───_lib
    │   │   │   ├───en-NZ
    │   │   │   │   └───_lib
    │   │   │   ├───en-US
    │   │   │   │   └───_lib
    │   │   │   ├───en-ZA
    │   │   │   │   └───_lib
    │   │   │   ├───eo
    │   │   │   │   └───_lib
    │   │   │   ├───es
    │   │   │   │   └───_lib
    │   │   │   ├───et
    │   │   │   │   └───_lib
    │   │   │   ├───eu
    │   │   │   │   └───_lib
    │   │   │   ├───fa-IR
    │   │   │   │   └───_lib
    │   │   │   ├───fi
    │   │   │   │   └───_lib
    │   │   │   ├───fr
    │   │   │   │   └───_lib
    │   │   │   ├───fr-CA
    │   │   │   │   └───_lib
    │   │   │   ├───fr-CH
    │   │   │   │   └───_lib
    │   │   │   ├───fy
    │   │   │   │   └───_lib
    │   │   │   ├───gd
    │   │   │   │   └───_lib
    │   │   │   ├───gl
    │   │   │   │   └───_lib
    │   │   │   ├───gu
    │   │   │   │   └───_lib
    │   │   │   ├───he
    │   │   │   │   └───_lib
    │   │   │   ├───hi
    │   │   │   │   └───_lib
    │   │   │   ├───hr
    │   │   │   │   └───_lib
    │   │   │   ├───ht
    │   │   │   │   └───_lib
    │   │   │   ├───hu
    │   │   │   │   └───_lib
    │   │   │   ├───hy
    │   │   │   │   └───_lib
    │   │   │   ├───id
    │   │   │   │   └───_lib
    │   │   │   ├───is
    │   │   │   │   └───_lib
    │   │   │   ├───it
    │   │   │   │   └───_lib
    │   │   │   ├───it-CH
    │   │   │   │   └───_lib
    │   │   │   ├───ja
    │   │   │   │   └───_lib
    │   │   │   ├───ja-Hira
    │   │   │   │   └───_lib
    │   │   │   ├───ka
    │   │   │   │   └───_lib
    │   │   │   ├───kk
    │   │   │   │   └───_lib
    │   │   │   ├───km
    │   │   │   │   └───_lib
    │   │   │   ├───kn
    │   │   │   │   └───_lib
    │   │   │   ├───ko
    │   │   │   │   └───_lib
    │   │   │   ├───lb
    │   │   │   │   └───_lib
    │   │   │   ├───lt
    │   │   │   │   └───_lib
    │   │   │   ├───lv
    │   │   │   │   └───_lib
    │   │   │   ├───mk
    │   │   │   │   └───_lib
    │   │   │   ├───mn
    │   │   │   │   └───_lib
    │   │   │   ├───ms
    │   │   │   │   └───_lib
    │   │   │   ├───mt
    │   │   │   │   └───_lib
    │   │   │   ├───nb
    │   │   │   │   └───_lib
    │   │   │   ├───nl
    │   │   │   │   └───_lib
    │   │   │   ├───nl-BE
    │   │   │   │   └───_lib
    │   │   │   ├───nn
    │   │   │   │   └───_lib
    │   │   │   ├───oc
    │   │   │   │   └───_lib
    │   │   │   ├───pl
    │   │   │   │   └───_lib
    │   │   │   ├───pt
    │   │   │   │   └───_lib
    │   │   │   ├───pt-BR
    │   │   │   │   └───_lib
    │   │   │   ├───ro
    │   │   │   │   └───_lib
    │   │   │   ├───ru
    │   │   │   │   └───_lib
    │   │   │   ├───se
    │   │   │   │   └───_lib
    │   │   │   ├───sk
    │   │   │   │   └───_lib
    │   │   │   ├───sl
    │   │   │   │   └───_lib
    │   │   │   ├───sq
    │   │   │   │   └───_lib
    │   │   │   ├───sr
    │   │   │   │   └───_lib
    │   │   │   ├───sr-Latn
    │   │   │   │   └───_lib
    │   │   │   ├───sv
    │   │   │   │   └───_lib
    │   │   │   ├───ta
    │   │   │   │   └───_lib
    │   │   │   ├───te
    │   │   │   │   └───_lib
    │   │   │   ├───th
    │   │   │   │   └───_lib
    │   │   │   ├───tr
    │   │   │   │   └───_lib
    │   │   │   ├───ug
    │   │   │   │   └───_lib
    │   │   │   ├───uk
    │   │   │   │   └───_lib
    │   │   │   ├───uz
    │   │   │   │   └───_lib
    │   │   │   ├───uz-Cyrl
    │   │   │   │   └───_lib
    │   │   │   ├───vi
    │   │   │   │   └───_lib
    │   │   │   ├───zh-CN
    │   │   │   │   └───_lib
    │   │   │   ├───zh-HK
    │   │   │   │   └───_lib
    │   │   │   ├───zh-TW
    │   │   │   │   └───_lib
    │   │   │   └───_lib
    │   │   ├───parse
    │   │   │   └───_lib
    │   │   │       └───parsers
    │   │   └───_lib
    │   │       └───format
    │   ├───debug
    │   │   └───src
    │   ├───decimal.js-light
    │   │   └───doc
    │   ├───dedent
    │   │   └───dist
    │   ├───depd
    │   │   └───lib
    │   │       └───browser
    │   ├───dequal
    │   │   ├───dist
    │   │   └───lite
    │   ├───destroy
    │   ├───detect-libc
    │   │   └───lib
    │   ├───detect-node-es
    │   │   ├───es5
    │   │   └───esm
    │   ├───diff
    │   │   ├───dist
    │   │   └───lib
    │   │       ├───convert
    │   │       ├───diff
    │   │       ├───patch
    │   │       └───util
    │   ├───dom-helpers
    │   │   ├───class
    │   │   ├───events
    │   │   ├───query
    │   │   ├───style
    │   │   ├───transition
    │   │   └───util
    │   ├───dunder-proto
    │   │   ├───.github
    │   │   └───test
    │   ├───eastasianwidth
    │   ├───editorconfig
    │   │   ├───bin
    │   │   ├───lib
    │   │   └───node_modules
    │   │       └───minimatch
    │   │           └───dist
    │   │               ├───cjs
    │   │               └───mjs
    │   ├───ee-first
    │   ├───electron-to-chromium
    │   ├───emoji-regex
    │   │   └───es2015
    │   ├───encodeurl
    │   ├───enhanced-resolve
    │   │   └───lib
    │   │       └───util
    │   ├───err-code
    │   │   └───test
    │   ├───error-ex
    │   ├───es-define-property
    │   │   ├───.github
    │   │   └───test
    │   ├───es-errors
    │   │   ├───.github
    │   │   └───test
    │   ├───es-module-lexer
    │   │   ├───dist
    │   │   └───types
    │   ├───es-object-atoms
    │   │   ├───.github
    │   │   └───test
    │   ├───esbuild
    │   │   ├───bin
    │   │   └───lib
    │   ├───escalade
    │   │   ├───dist
    │   │   └───sync
    │   ├───escape-html
    │   ├───escape-string-regexp
    │   ├───etag
    │   ├───eventemitter3
    │   │   └───umd
    │   ├───exit-hook
    │   ├───express
    │   │   ├───lib
    │   │   │   ├───middleware
    │   │   │   └───router
    │   │   └───node_modules
    │   │       ├───debug
    │   │       │   └───src
    │   │       └───ms
    │   ├───fast-equals
    │   │   ├───config
    │   │   │   ├───rollup
    │   │   │   └───tsconfig
    │   │   ├───dist
    │   │   │   ├───cjs
    │   │   │   │   └───types
    │   │   │   ├───esm
    │   │   │   │   └───types
    │   │   │   ├───min
    │   │   │   │   └───types
    │   │   │   └───umd
    │   │   │       └───types
    │   │   ├───recipes
    │   │   ├───scripts
    │   │   └───src
    │   ├───finalhandler
    │   │   └───node_modules
    │   │       ├───debug
    │   │       │   └───src
    │   │       └───ms
    │   ├───find-root
    │   │   └───test
    │   ├───foreground-child
    │   │   └───dist
    │   │       ├───commonjs
    │   │       └───esm
    │   ├───forwarded
    │   ├───framer-motion
    │   │   ├───client
    │   │   ├───dist
    │   │   │   ├───cjs
    │   │   │   ├───es
    │   │   │   │   ├───animation
    │   │   │   │   │   ├───animate
    │   │   │   │   │   ├───animators
    │   │   │   │   │   │   ├───drivers
    │   │   │   │   │   │   ├───utils
    │   │   │   │   │   │   └───waapi
    │   │   │   │   │   │       └───utils
    │   │   │   │   │   ├───generators
    │   │   │   │   │   │   ├───spring
    │   │   │   │   │   │   └───utils
    │   │   │   │   │   ├───hooks
    │   │   │   │   │   ├───interfaces
    │   │   │   │   │   ├───optimized-appear
    │   │   │   │   │   ├───sequence
    │   │   │   │   │   │   └───utils
    │   │   │   │   │   └───utils
    │   │   │   │   ├───components
    │   │   │   │   │   ├───AnimatePresence
    │   │   │   │   │   ├───LayoutGroup
    │   │   │   │   │   ├───LazyMotion
    │   │   │   │   │   ├───MotionConfig
    │   │   │   │   │   └───Reorder
    │   │   │   │   │       └───utils
    │   │   │   │   ├───context
    │   │   │   │   │   └───MotionContext
    │   │   │   │   ├───easing
    │   │   │   │   │   ├───modifiers
    │   │   │   │   │   └───utils
    │   │   │   │   ├───events
    │   │   │   │   ├───gestures
    │   │   │   │   │   ├───drag
    │   │   │   │   │   │   └───utils
    │   │   │   │   │   └───pan
    │   │   │   │   ├───motion
    │   │   │   │   │   ├───features
    │   │   │   │   │   │   ├───animation
    │   │   │   │   │   │   ├───layout
    │   │   │   │   │   │   └───viewport
    │   │   │   │   │   └───utils
    │   │   │   │   ├───projection
    │   │   │   │   │   ├───animation
    │   │   │   │   │   ├───geometry
    │   │   │   │   │   ├───node
    │   │   │   │   │   ├───shared
    │   │   │   │   │   ├───styles
    │   │   │   │   │   └───utils
    │   │   │   │   ├───render
    │   │   │   │   │   ├───components
    │   │   │   │   │   │   ├───m
    │   │   │   │   │   │   └───motion
    │   │   │   │   │   ├───dom
    │   │   │   │   │   │   ├───resize
    │   │   │   │   │   │   ├───scroll
    │   │   │   │   │   │   │   └───offsets
    │   │   │   │   │   │   ├───utils
    │   │   │   │   │   │   ├───value-types
    │   │   │   │   │   │   └───viewport
    │   │   │   │   │   ├───html
    │   │   │   │   │   │   └───utils
    │   │   │   │   │   ├───object
    │   │   │   │   │   ├───svg
    │   │   │   │   │   │   └───utils
    │   │   │   │   │   └───utils
    │   │   │   │   ├───utils
    │   │   │   │   │   ├───mix
    │   │   │   │   │   ├───offsets
    │   │   │   │   │   └───reduced-motion
    │   │   │   │   └───value
    │   │   │   │       ├───scroll
    │   │   │   │       ├───types
    │   │   │   │       │   ├───color
    │   │   │   │       │   ├───complex
    │   │   │   │       │   ├───numbers
    │   │   │   │       │   └───utils
    │   │   │   │       ├───use-will-change
    │   │   │   │       └───utils
    │   │   │   └───types
    │   │   ├───dom
    │   │   │   └───mini
    │   │   ├───m
    │   │   └───mini
    │   ├───fresh
    │   ├───fs-extra
    │   │   └───lib
    │   │       ├───copy
    │   │       ├───empty
    │   │       ├───ensure
    │   │       ├───fs
    │   │       ├───json
    │   │       ├───mkdirs
    │   │       ├───move
    │   │       ├───output-file
    │   │       ├───path-exists
    │   │       ├───remove
    │   │       └───util
    │   ├───function-bind
    │   │   ├───.github
    │   │   └───test
    │   ├───gensync
    │   │   └───test
    │   ├───get-intrinsic
    │   │   ├───.github
    │   │   └───test
    │   ├───get-nonce
    │   │   └───dist
    │   │       ├───es2015
    │   │       └───es5
    │   ├───get-port
    │   ├───get-proto
    │   │   ├───.github
    │   │   └───test
    │   ├───glob
    │   │   └───dist
    │   │       ├───commonjs
    │   │       └───esm
    │   ├───globals
    │   ├───globrex
    │   ├───gopd
    │   │   ├───.github
    │   │   └───test
    │   ├───graceful-fs
    │   ├───has-symbols
    │   │   ├───.github
    │   │   └───test
    │   │       └───shams
    │   ├───hasown
    │   │   └───.github
    │   ├───hoist-non-react-statics
    │   │   ├───dist
    │   │   ├───node_modules
    │   │   │   └───react-is
    │   │   │       ├───cjs
    │   │   │       └───umd
    │   │   └───src
    │   ├───hosted-git-info
    │   │   ├───lib
    │   │   └───node_modules
    │   │       └───lru-cache
    │   ├───html
    │   │   ├───bin
    │   │   ├───img
    │   │   ├───lib
    │   │   └───src
    │   ├───http-errors
    │   ├───iconv-lite
    │   │   ├───encodings
    │   │   │   └───tables
    │   │   └───lib
    │   ├───import-fresh
    │   ├───inherits
    │   ├───ini
    │   ├───internmap
    │   │   ├───dist
    │   │   └───src
    │   ├───ipaddr.js
    │   │   └───lib
    │   ├───is-arrayish
    │   ├───is-core-module
    │   │   └───test
    │   ├───is-fullwidth-code-point
    │   ├───isarray
    │   ├───isbot
    │   ├───isexe
    │   │   └───test
    │   ├───jackspeak
    │   │   └───dist
    │   │       ├───commonjs
    │   │       └───esm
    │   ├───jiti
    │   │   ├───dist
    │   │   └───lib
    │   ├───js-beautify
    │   │   └───js
    │   │       ├───bin
    │   │       ├───lib
    │   │       │   └───unpackers
    │   │       └───src
    │   │           ├───core
    │   │           ├───css
    │   │           ├───html
    │   │           ├───javascript
    │   │           └───unpackers
    │   ├───js-cookie
    │   │   └───dist
    │   ├───js-tokens
    │   ├───jsesc
    │   │   ├───bin
    │   │   └───man
    │   ├───json-parse-even-better-errors
    │   │   └───lib
    │   ├───json5
    │   │   ├───dist
    │   │   └───lib
    │   ├───jsonfile
    │   ├───lightningcss
    │   │   └───node
    │   ├───lightningcss-win32-x64-msvc
    │   ├───lines-and-columns
    │   │   └───build
    │   ├───lodash
    │   │   └───fp
    │   ├───loose-envify
    │   ├───lru-cache
    │   ├───lucide-react
    │   │   └───dist
    │   │       ├───cjs
    │   │       ├───esm
    │   │       │   ├───icons
    │   │       │   └───shared
    │   │       │       └───src
    │   │       └───umd
    │   ├───math-intrinsics
    │   │   ├───.github
    │   │   ├───constants
    │   │   └───test
    │   ├───media-typer
    │   ├───memoize-one
    │   │   ├───dist
    │   │   └───src
    │   ├───merge-descriptors
    │   ├───methods
    │   ├───mime
    │   │   └───src
    │   ├───mime-db
    │   ├───mime-types
    │   │   └───node_modules
    │   │       └───mime-db
    │   ├───minimatch
    │   │   └───dist
    │   │       ├───commonjs
    │   │       └───esm
    │   ├───minipass
    │   │   └───dist
    │   │       ├───commonjs
    │   │       └───esm
    │   ├───morgan
    │   │   └───node_modules
    │   │       ├───debug
    │   │       │   └───src
    │   │       ├───ms
    │   │       └───on-finished
    │   ├───motion-dom
    │   │   └───dist
    │   │       ├───cjs
    │   │       └───es
    │   │           ├───animation
    │   │           │   ├───generators
    │   │           │   │   └───utils
    │   │           │   ├───keyframes
    │   │           │   ├───utils
    │   │           │   └───waapi
    │   │           │       ├───easing
    │   │           │       ├───supports
    │   │           │       └───utils
    │   │           ├───frameloop
    │   │           ├───gestures
    │   │           │   ├───drag
    │   │           │   │   └───state
    │   │           │   ├───press
    │   │           │   │   └───utils
    │   │           │   └───utils
    │   │           ├───render
    │   │           │   └───dom
    │   │           ├───stats
    │   │           ├───utils
    │   │           │   └───supports
    │   │           ├───value
    │   │           └───view
    │   │               └───utils
    │   ├───motion-utils
    │   │   └───dist
    │   │       ├───cjs
    │   │       └───es
    │   ├───ms
    │   ├───nanoid
    │   │   ├───async
    │   │   ├───bin
    │   │   ├───non-secure
    │   │   └───url-alphabet
    │   ├───negotiator
    │   │   └───lib
    │   ├───node-releases
    │   │   └───data
    │   │       ├───processed
    │   │       └───release-schedule
    │   ├───nopt
    │   │   ├───bin
    │   │   └───lib
    │   ├───normalize-package-data
    │   │   └───lib
    │   ├───npm-install-checks
    │   │   └───lib
    │   ├───npm-normalize-package-bin
    │   │   └───lib
    │   ├───npm-package-arg
    │   │   └───lib
    │   ├───npm-pick-manifest
    │   │   └───lib
    │   ├───object-assign
    │   ├───object-inspect
    │   │   ├───.github
    │   │   ├───example
    │   │   └───test
    │   │       └───browser
    │   ├───on-finished
    │   ├───on-headers
    │   ├───package-json-from-dist
    │   │   └───dist
    │   │       ├───commonjs
    │   │       └───esm
    │   ├───parent-module
    │   ├───parse-json
    │   │   └───node_modules
    │   │       └───json-parse-even-better-errors
    │   ├───parseurl
    │   ├───path-key
    │   ├───path-parse
    │   ├───path-scurry
    │   │   ├───dist
    │   │   │   ├───commonjs
    │   │   │   └───esm
    │   │   └───node_modules
    │   │       └───lru-cache
    │   │           └───dist
    │   │               ├───commonjs
    │   │               └───esm
    │   ├───path-to-regexp
    │   ├───path-type
    │   ├───pathe
    │   │   └───dist
    │   │       └───shared
    │   ├───picocolors
    │   ├───postcss
    │   │   └───lib
    │   ├───prettier
    │   │   └───esm
    │   ├───proc-log
    │   │   └───lib
    │   ├───process-nextick-args
    │   ├───promise-inflight
    │   ├───promise-retry
    │   │   └───test
    │   ├───prop-types
    │   │   ├───lib
    │   │   └───node_modules
    │   │       └───react-is
    │   │           ├───cjs
    │   │           └───umd
    │   ├───proto-list
    │   │   └───test
    │   ├───proxy-addr
    │   ├───qs
    │   │   ├───.github
    │   │   ├───dist
    │   │   ├───lib
    │   │   └───test
    │   ├───range-parser
    │   ├───raw-body
    │   ├───react
    │   │   └───cjs
    │   ├───react-d3-tree
    │   │   ├───lib
    │   │   │   ├───cjs
    │   │   │   │   ├───Link
    │   │   │   │   ├───Node
    │   │   │   │   ├───Tree
    │   │   │   │   └───types
    │   │   │   ├───esm
    │   │   │   │   ├───Link
    │   │   │   │   ├───Node
    │   │   │   │   ├───Tree
    │   │   │   │   └───types
    │   │   │   └───types
    │   │   │       ├───Link
    │   │   │       ├───Node
    │   │   │       ├───Tree
    │   │   │       └───types
    │   │   └───node_modules
    │   │       ├───.bin
    │   │       └───uuid
    │   │           └───dist
    │   │               ├───bin
    │   │               ├───esm-browser
    │   │               ├───esm-node
    │   │               └───umd
    │   ├───react-day-picker
    │   │   ├───dist
    │   │   └───src
    │   │       ├───components
    │   │       │   ├───Button
    │   │       │   ├───Caption
    │   │       │   ├───CaptionDropdowns
    │   │       │   ├───CaptionLabel
    │   │       │   ├───CaptionNavigation
    │   │       │   ├───Day
    │   │       │   ├───DayContent
    │   │       │   ├───Dropdown
    │   │       │   ├───Footer
    │   │       │   ├───Head
    │   │       │   ├───HeadRow
    │   │       │   │   └───utils
    │   │       │   ├───IconDropdown
    │   │       │   ├───IconLeft
    │   │       │   ├───IconRight
    │   │       │   ├───Month
    │   │       │   ├───Months
    │   │       │   ├───MonthsDropdown
    │   │       │   │   └───__snapshots__
    │   │       │   ├───Navigation
    │   │       │   ├───Root
    │   │       │   ├───Row
    │   │       │   ├───Table
    │   │       │   │   ├───utils
    │   │       │   │   └───__snapshots__
    │   │       │   ├───WeekNumber
    │   │       │   │   └───__snapshots__
    │   │       │   └───YearsDropdown
    │   │       │       └───__snapshots__
    │   │       ├───contexts
    │   │       │   ├───DayPicker
    │   │       │   │   ├───formatters
    │   │       │   │   ├───labels
    │   │       │   │   └───utils
    │   │       │   ├───Focus
    │   │       │   │   └───utils
    │   │       │   ├───Modifiers
    │   │       │   │   └───utils
    │   │       │   ├───Navigation
    │   │       │   │   └───utils
    │   │       │   ├───SelectMultiple
    │   │       │   ├───SelectRange
    │   │       │   │   └───utils
    │   │       │   └───SelectSingle
    │   │       ├───hooks
    │   │       │   ├───useActiveModifiers
    │   │       │   ├───useControlledValue
    │   │       │   ├───useDayEventHandlers
    │   │       │   ├───useDayRender
    │   │       │   │   └───utils
    │   │       │   ├───useId
    │   │       │   ├───useInput
    │   │       │   │   └───utils
    │   │       │   └───useSelectedDays
    │   │       └───types
    │   ├───react-diff-viewer-continued
    │   │   ├───.github
    │   │   │   └───workflows
    │   │   ├───.idea
    │   │   └───lib
    │   │       ├───cjs
    │   │       │   └───src
    │   │       └───esm
    │   │           └───src
    │   ├───react-dom
    │   │   └───cjs
    │   ├───react-hook-form
    │   │   └───dist
    │   │       ├───logic
    │   │       ├───types
    │   │       │   └───path
    │   │       ├───utils
    │   │       └───__typetest__
    │   │           ├───path
    │   │           └───__fixtures__
    │   ├───react-hotkeys-hook
    │   │   ├───dist
    │   │   └───src
    │   ├───react-is
    │   │   └───cjs
    │   ├───react-lifecycles-compat
    │   ├───react-refresh
    │   │   └───cjs
    │   ├───react-remove-scroll
    │   │   ├───dist
    │   │   │   ├───es2015
    │   │   │   ├───es2019
    │   │   │   └───es5
    │   │   ├───sidecar
    │   │   └───UI
    │   ├───react-remove-scroll-bar
    │   │   ├───constants
    │   │   └───dist
    │   │       ├───es2015
    │   │       ├───es2019
    │   │       └───es5
    │   ├───react-router
    │   │   ├───dist
    │   │   │   ├───development
    │   │   │   │   └───lib
    │   │   │   │       └───types
    │   │   │   └───production
    │   │   │       └───lib
    │   │   │           └───types
    │   │   └───node_modules
    │   │       └───cookie
    │   │           └───dist
    │   ├───react-router-devtools
    │   │   ├───dist
    │   │   └───node_modules
    │   │       └───date-fns
    │   │           ├───docs
    │   │           ├───fp
    │   │           │   └───_lib
    │   │           ├───locale
    │   │           │   ├───af
    │   │           │   │   └───_lib
    │   │           │   ├───ar
    │   │           │   │   └───_lib
    │   │           │   ├───ar-DZ
    │   │           │   │   └───_lib
    │   │           │   ├───ar-EG
    │   │           │   │   └───_lib
    │   │           │   ├───ar-MA
    │   │           │   │   └───_lib
    │   │           │   ├───ar-SA
    │   │           │   │   └───_lib
    │   │           │   ├───ar-TN
    │   │           │   │   └───_lib
    │   │           │   ├───az
    │   │           │   │   └───_lib
    │   │           │   ├───be
    │   │           │   │   └───_lib
    │   │           │   ├───be-tarask
    │   │           │   │   └───_lib
    │   │           │   ├───bg
    │   │           │   │   └───_lib
    │   │           │   ├───bn
    │   │           │   │   └───_lib
    │   │           │   ├───bs
    │   │           │   │   └───_lib
    │   │           │   ├───ca
    │   │           │   │   └───_lib
    │   │           │   ├───ckb
    │   │           │   │   └───_lib
    │   │           │   ├───cs
    │   │           │   │   └───_lib
    │   │           │   ├───cy
    │   │           │   │   └───_lib
    │   │           │   ├───da
    │   │           │   │   └───_lib
    │   │           │   ├───de
    │   │           │   │   └───_lib
    │   │           │   ├───de-AT
    │   │           │   │   └───_lib
    │   │           │   ├───el
    │   │           │   │   └───_lib
    │   │           │   ├───en-AU
    │   │           │   │   └───_lib
    │   │           │   ├───en-CA
    │   │           │   │   └───_lib
    │   │           │   ├───en-GB
    │   │           │   │   └───_lib
    │   │           │   ├───en-IE
    │   │           │   ├───en-IN
    │   │           │   │   └───_lib
    │   │           │   ├───en-NZ
    │   │           │   │   └───_lib
    │   │           │   ├───en-US
    │   │           │   │   └───_lib
    │   │           │   ├───en-ZA
    │   │           │   │   └───_lib
    │   │           │   ├───eo
    │   │           │   │   └───_lib
    │   │           │   ├───es
    │   │           │   │   └───_lib
    │   │           │   ├───et
    │   │           │   │   └───_lib
    │   │           │   ├───eu
    │   │           │   │   └───_lib
    │   │           │   ├───fa-IR
    │   │           │   │   └───_lib
    │   │           │   ├───fi
    │   │           │   │   └───_lib
    │   │           │   ├───fr
    │   │           │   │   └───_lib
    │   │           │   ├───fr-CA
    │   │           │   │   └───_lib
    │   │           │   ├───fr-CH
    │   │           │   │   └───_lib
    │   │           │   ├───fy
    │   │           │   │   └───_lib
    │   │           │   ├───gd
    │   │           │   │   └───_lib
    │   │           │   ├───gl
    │   │           │   │   └───_lib
    │   │           │   ├───gu
    │   │           │   │   └───_lib
    │   │           │   ├───he
    │   │           │   │   └───_lib
    │   │           │   ├───hi
    │   │           │   │   └───_lib
    │   │           │   ├───hr
    │   │           │   │   └───_lib
    │   │           │   ├───ht
    │   │           │   │   └───_lib
    │   │           │   ├───hu
    │   │           │   │   └───_lib
    │   │           │   ├───hy
    │   │           │   │   └───_lib
    │   │           │   ├───id
    │   │           │   │   └───_lib
    │   │           │   ├───is
    │   │           │   │   └───_lib
    │   │           │   ├───it
    │   │           │   │   └───_lib
    │   │           │   ├───it-CH
    │   │           │   │   └───_lib
    │   │           │   ├───ja
    │   │           │   │   └───_lib
    │   │           │   ├───ja-Hira
    │   │           │   │   └───_lib
    │   │           │   ├───ka
    │   │           │   │   └───_lib
    │   │           │   ├───kk
    │   │           │   │   └───_lib
    │   │           │   ├───km
    │   │           │   │   └───_lib
    │   │           │   ├───kn
    │   │           │   │   └───_lib
    │   │           │   ├───ko
    │   │           │   │   └───_lib
    │   │           │   ├───lb
    │   │           │   │   └───_lib
    │   │           │   ├───lt
    │   │           │   │   └───_lib
    │   │           │   ├───lv
    │   │           │   │   └───_lib
    │   │           │   ├───mk
    │   │           │   │   └───_lib
    │   │           │   ├───mn
    │   │           │   │   └───_lib
    │   │           │   ├───ms
    │   │           │   │   └───_lib
    │   │           │   ├───mt
    │   │           │   │   └───_lib
    │   │           │   ├───nb
    │   │           │   │   └───_lib
    │   │           │   ├───nl
    │   │           │   │   └───_lib
    │   │           │   ├───nl-BE
    │   │           │   │   └───_lib
    │   │           │   ├───nn
    │   │           │   │   └───_lib
    │   │           │   ├───oc
    │   │           │   │   └───_lib
    │   │           │   ├───pl
    │   │           │   │   └───_lib
    │   │           │   ├───pt
    │   │           │   │   └───_lib
    │   │           │   ├───pt-BR
    │   │           │   │   └───_lib
    │   │           │   ├───ro
    │   │           │   │   └───_lib
    │   │           │   ├───ru
    │   │           │   │   └───_lib
    │   │           │   ├───se
    │   │           │   │   └───_lib
    │   │           │   ├───sk
    │   │           │   │   └───_lib
    │   │           │   ├───sl
    │   │           │   │   └───_lib
    │   │           │   ├───sq
    │   │           │   │   └───_lib
    │   │           │   ├───sr
    │   │           │   │   └───_lib
    │   │           │   ├───sr-Latn
    │   │           │   │   └───_lib
    │   │           │   ├───sv
    │   │           │   │   └───_lib
    │   │           │   ├───ta
    │   │           │   │   └───_lib
    │   │           │   ├───te
    │   │           │   │   └───_lib
    │   │           │   ├───th
    │   │           │   │   └───_lib
    │   │           │   ├───tr
    │   │           │   │   └───_lib
    │   │           │   ├───ug
    │   │           │   │   └───_lib
    │   │           │   ├───uk
    │   │           │   │   └───_lib
    │   │           │   ├───uz
    │   │           │   │   └───_lib
    │   │           │   ├───uz-Cyrl
    │   │           │   │   └───_lib
    │   │           │   ├───vi
    │   │           │   │   └───_lib
    │   │           │   ├───zh-CN
    │   │           │   │   └───_lib
    │   │           │   ├───zh-HK
    │   │           │   │   └───_lib
    │   │           │   ├───zh-TW
    │   │           │   │   └───_lib
    │   │           │   └───_lib
    │   │           ├───parse
    │   │           │   └───_lib
    │   │           │       └───parsers
    │   │           └───_lib
    │   │               └───format
    │   ├───react-smooth
    │   │   ├───es6
    │   │   ├───lib
    │   │   ├───src
    │   │   └───umd
    │   ├───react-style-singleton
    │   │   └───dist
    │   │       ├───es2015
    │   │       ├───es2019
    │   │       └───es5
    │   ├───react-tooltip
    │   │   └───dist
    │   ├───react-transition-group
    │   │   ├───cjs
    │   │   │   └───utils
    │   │   ├───config
    │   │   ├───CSSTransition
    │   │   ├───dist
    │   │   ├───esm
    │   │   │   └───utils
    │   │   ├───node_modules
    │   │   │   └───dom-helpers
    │   │   │       ├───activeElement
    │   │   │       ├───addClass
    │   │   │       ├───addEventListener
    │   │   │       ├───animate
    │   │   │       ├───animationFrame
    │   │   │       ├───attribute
    │   │   │       ├───camelize
    │   │   │       ├───camelizeStyle
    │   │   │       ├───canUseDOM
    │   │   │       ├───childElements
    │   │   │       ├───childNodes
    │   │   │       ├───cjs
    │   │   │       ├───clear
    │   │   │       ├───closest
    │   │   │       ├───collectElements
    │   │   │       ├───collectSiblings
    │   │   │       ├───contains
    │   │   │       ├───css
    │   │   │       ├───esm
    │   │   │       ├───filterEventHandler
    │   │   │       ├───getComputedStyle
    │   │   │       ├───getScrollAccessor
    │   │   │       ├───hasClass
    │   │   │       ├───height
    │   │   │       ├───hyphenate
    │   │   │       ├───hyphenateStyle
    │   │   │       ├───insertAfter
    │   │   │       ├───isDocument
    │   │   │       ├───isInput
    │   │   │       ├───isTransform
    │   │   │       ├───isVisible
    │   │   │       ├───isWindow
    │   │   │       ├───listen
    │   │   │       ├───matches
    │   │   │       ├───nextUntil
    │   │   │       ├───offset
    │   │   │       ├───offsetParent
    │   │   │       ├───ownerDocument
    │   │   │       ├───ownerWindow
    │   │   │       ├───parents
    │   │   │       ├───position
    │   │   │       ├───prepend
    │   │   │       ├───querySelectorAll
    │   │   │       ├───remove
    │   │   │       ├───removeClass
    │   │   │       ├───removeEventListener
    │   │   │       ├───scrollbarSize
    │   │   │       ├───scrollLeft
    │   │   │       ├───scrollParent
    │   │   │       ├───scrollTo
    │   │   │       ├───scrollTop
    │   │   │       ├───siblings
    │   │   │       ├───text
    │   │   │       ├───toggleClass
    │   │   │       ├───transitionEnd
    │   │   │       ├───triggerEvent
    │   │   │       └───width
    │   │   ├───ReplaceTransition
    │   │   ├───SwitchTransition
    │   │   ├───Transition
    │   │   ├───TransitionGroup
    │   │   └───TransitionGroupContext
    │   ├───readable-stream
    │   │   ├───doc
    │   │   │   └───wg-meetings
    │   │   ├───lib
    │   │   │   └───internal
    │   │   │       └───streams
    │   │   └───node_modules
    │   │       └───safe-buffer
    │   ├───readdirp
    │   │   └───esm
    │   ├───recharts
    │   │   ├───es6
    │   │   │   ├───cartesian
    │   │   │   ├───chart
    │   │   │   ├───component
    │   │   │   ├───container
    │   │   │   ├───context
    │   │   │   ├───numberAxis
    │   │   │   ├───polar
    │   │   │   ├───shape
    │   │   │   └───util
    │   │   │       ├───cursor
    │   │   │       ├───payload
    │   │   │       └───tooltip
    │   │   ├───lib
    │   │   │   ├───cartesian
    │   │   │   ├───chart
    │   │   │   ├───component
    │   │   │   ├───container
    │   │   │   ├───context
    │   │   │   ├───numberAxis
    │   │   │   ├───polar
    │   │   │   ├───shape
    │   │   │   └───util
    │   │   │       ├───cursor
    │   │   │       ├───payload
    │   │   │       └───tooltip
    │   │   ├───node_modules
    │   │   │   └───react-is
    │   │   │       ├───cjs
    │   │   │       └───umd
    │   │   ├───types
    │   │   │   ├───cartesian
    │   │   │   ├───chart
    │   │   │   ├───component
    │   │   │   ├───container
    │   │   │   ├───context
    │   │   │   ├───numberAxis
    │   │   │   ├───polar
    │   │   │   ├───shape
    │   │   │   └───util
    │   │   │       ├───cursor
    │   │   │       ├───payload
    │   │   │       └───tooltip
    │   │   └───umd
    │   ├───recharts-scale
    │   │   ├───es6
    │   │   │   └───util
    │   │   ├───lib
    │   │   │   └───util
    │   │   ├───src
    │   │   │   └───util
    │   │   └───umd
    │   ├───regenerator-runtime
    │   ├───resolve
    │   │   ├───.github
    │   │   ├───bin
    │   │   ├───example
    │   │   ├───lib
    │   │   └───test
    │   │       ├───dotdot
    │   │       │   └───abc
    │   │       ├───module_dir
    │   │       │   ├───xmodules
    │   │       │   │   └───aaa
    │   │       │   ├───ymodules
    │   │       │   │   └───aaa
    │   │       │   └───zmodules
    │   │       │       └───bbb
    │   │       ├───node_path
    │   │       │   ├───x
    │   │       │   │   ├───aaa
    │   │       │   │   └───ccc
    │   │       │   └───y
    │   │       │       ├───bbb
    │   │       │       └───ccc
    │   │       ├───pathfilter
    │   │       │   └───deep_ref
    │   │       ├───precedence
    │   │       │   ├───aaa
    │   │       │   └───bbb
    │   │       ├───resolver
    │   │       │   ├───baz
    │   │       │   ├───browser_field
    │   │       │   ├───dot_main
    │   │       │   ├───dot_slash_main
    │   │       │   ├───false_main
    │   │       │   ├───incorrect_main
    │   │       │   ├───invalid_main
    │   │       │   ├───multirepo
    │   │       │   │   └───packages
    │   │       │   │       ├───package-a
    │   │       │   │       └───package-b
    │   │       │   ├───nested_symlinks
    │   │       │   │   └───mylib
    │   │       │   ├───other_path
    │   │       │   │   └───lib
    │   │       │   ├───quux
    │   │       │   │   └───foo
    │   │       │   ├───same_names
    │   │       │   │   └───foo
    │   │       │   ├───symlinked
    │   │       │   │   ├───package
    │   │       │   │   └───_
    │   │       │   │       ├───node_modules
    │   │       │   │       └───symlink_target
    │   │       │   └───without_basedir
    │   │       └───shadowed_core
    │   │           └───node_modules
    │   │               └───util
    │   ├───resolve-from
    │   ├───retry
    │   │   ├───example
    │   │   ├───lib
    │   │   └───test
    │   │       └───integration
    │   ├───rollup
    │   │   └───dist
    │   │       ├───bin
    │   │       ├───es
    │   │       │   └───shared
    │   │       └───shared
    │   ├───safe-buffer
    │   ├───safer-buffer
    │   ├───scheduler
    │   │   └───cjs
    │   ├───semver
    │   │   ├───bin
    │   │   ├───classes
    │   │   ├───functions
    │   │   ├───internal
    │   │   └───ranges
    │   ├───send
    │   │   └───node_modules
    │   │       ├───debug
    │   │       │   ├───node_modules
    │   │       │   │   └───ms
    │   │       │   └───src
    │   │       └───encodeurl
    │   ├───serve-static
    │   ├───set-cookie-parser
    │   │   └───lib
    │   ├───setprototypeof
    │   │   └───test
    │   ├───shebang-command
    │   ├───shebang-regex
    │   ├───side-channel
    │   │   ├───.github
    │   │   └───test
    │   ├───side-channel-list
    │   │   ├───.github
    │   │   └───test
    │   ├───side-channel-map
    │   │   ├───.github
    │   │   └───test
    │   ├───side-channel-weakmap
    │   │   ├───.github
    │   │   └───test
    │   ├───signal-exit
    │   │   └───dist
    │   │       ├───cjs
    │   │       └───mjs
    │   ├───source-map
    │   │   ├───dist
    │   │   └───lib
    │   ├───source-map-js
    │   │   └───lib
    │   ├───source-map-support
    │   │   └───node_modules
    │   │       └───source-map
    │   │           ├───dist
    │   │           └───lib
    │   ├───spdx-correct
    │   ├───spdx-exceptions
    │   ├───spdx-expression-parse
    │   ├───spdx-license-ids
    │   ├───statuses
    │   ├───stream-slice
    │   ├───string-width
    │   ├───string-width-cjs
    │   │   └───node_modules
    │   │       ├───ansi-regex
    │   │       ├───emoji-regex
    │   │       │   └───es2015
    │   │       └───strip-ansi
    │   ├───string_decoder
    │   │   ├───lib
    │   │   └───node_modules
    │   │       └───safe-buffer
    │   ├───strip-ansi
    │   ├───strip-ansi-cjs
    │   │   └───node_modules
    │   │       └───ansi-regex
    │   ├───stylis
    │   │   ├───dist
    │   │   │   └───umd
    │   │   └───src
    │   ├───supports-preserve-symlinks-flag
    │   │   ├───.github
    │   │   └───test
    │   ├───tailwind-merge
    │   │   ├───dist
    │   │   │   └───es5
    │   │   └───src
    │   │       └───lib
    │   ├───tailwindcss
    │   │   └───dist
    │   ├───tailwindcss-animate
    │   ├───tapable
    │   │   └───lib
    │   ├───tiny-invariant
    │   │   ├───dist
    │   │   │   └───esm
    │   │   └───src
    │   ├───toidentifier
    │   ├───tsconfck
    │   │   ├───bin
    │   │   ├───src
    │   │   └───types
    │   ├───tslib
    │   │   └───modules
    │   ├───turbo-stream
    │   │   └───dist
    │   ├───type-is
    │   ├───typedarray
    │   │   ├───example
    │   │   └───test
    │   │       └───server
    │   ├───typescript
    │   │   ├───bin
    │   │   └───lib
    │   │       ├───cs
    │   │       ├───de
    │   │       ├───es
    │   │       ├───fr
    │   │       ├───it
    │   │       ├───ja
    │   │       ├───ko
    │   │       ├───pl
    │   │       ├───pt-br
    │   │       ├───ru
    │   │       ├───tr
    │   │       ├───zh-cn
    │   │       └───zh-tw
    │   ├───undici
    │   │   ├───docs
    │   │   │   └───docs
    │   │   │       ├───api
    │   │   │       └───best-practices
    │   │   ├───lib
    │   │   │   ├───api
    │   │   │   ├───core
    │   │   │   ├───dispatcher
    │   │   │   ├───handler
    │   │   │   ├───interceptor
    │   │   │   ├───llhttp
    │   │   │   ├───mock
    │   │   │   ├───util
    │   │   │   └───web
    │   │   │       ├───cache
    │   │   │       ├───cookies
    │   │   │       ├───eventsource
    │   │   │       ├───fetch
    │   │   │       ├───fileapi
    │   │   │       └───websocket
    │   │   ├───scripts
    │   │   └───types
    │   ├───undici-types
    │   ├───universalify
    │   ├───unpipe
    │   ├───update-browserslist-db
    │   ├───use-callback-ref
    │   │   └───dist
    │   │       ├───es2015
    │   │       ├───es2019
    │   │       └───es5
    │   ├───use-sidecar
    │   │   └───dist
    │   │       ├───es2015
    │   │       ├───es2019
    │   │       └───es5
    │   ├───util-deprecate
    │   ├───utils-merge
    │   ├───uuid
    │   │   └───dist
    │   │       ├───cjs
    │   │       ├───cjs-browser
    │   │       ├───esm
    │   │       │   └───bin
    │   │       └───esm-browser
    │   ├───valibot
    │   │   └───dist
    │   ├───validate-npm-package-license
    │   ├───validate-npm-package-name
    │   │   └───lib
    │   ├───vary
    │   ├───victory-vendor
    │   │   ├───es
    │   │   ├───lib
    │   │   ├───lib-vendor
    │   │   │   ├───d3-array
    │   │   │   │   └───src
    │   │   │   │       └───threshold
    │   │   │   ├───d3-color
    │   │   │   │   └───src
    │   │   │   ├───d3-ease
    │   │   │   │   └───src
    │   │   │   ├───d3-format
    │   │   │   │   └───src
    │   │   │   ├───d3-interpolate
    │   │   │   │   └───src
    │   │   │   │       └───transform
    │   │   │   ├───d3-path
    │   │   │   │   └───src
    │   │   │   ├───d3-scale
    │   │   │   │   └───src
    │   │   │   ├───d3-shape
    │   │   │   │   └───src
    │   │   │   │       ├───curve
    │   │   │   │       ├───offset
    │   │   │   │       ├───order
    │   │   │   │       └───symbol
    │   │   │   ├───d3-time
    │   │   │   │   └───src
    │   │   │   ├───d3-time-format
    │   │   │   │   └───src
    │   │   │   ├───d3-timer
    │   │   │   │   └───src
    │   │   │   ├───d3-voronoi
    │   │   │   │   └───src
    │   │   │   └───internmap
    │   │   │       └───src
    │   │   └───node_modules
    │   │       ├───d3-path
    │   │       │   ├───dist
    │   │       │   └───src
    │   │       └───d3-shape
    │   │           ├───dist
    │   │           └───src
    │   │               ├───curve
    │   │               ├───offset
    │   │               ├───order
    │   │               └───symbol
    │   ├───vite
    │   │   ├───bin
    │   │   ├───dist
    │   │   │   ├───client
    │   │   │   ├───node
    │   │   │   │   └───chunks
    │   │   │   └───node-cjs
    │   │   ├───misc
    │   │   └───types
    │   │       └───internal
    │   ├───vite-node
    │   │   └───dist
    │   ├───vite-tsconfig-paths
    │   │   ├───dist
    │   │   └───src
    │   ├───warning
    │   ├───which
    │   │   ├───bin
    │   │   └───lib
    │   ├───wrap-ansi
    │   ├───wrap-ansi-cjs
    │   │   └───node_modules
    │   │       ├───ansi-regex
    │   │       ├───ansi-styles
    │   │       ├───emoji-regex
    │   │       │   └───es2015
    │   │       ├───string-width
    │   │       └───strip-ansi
    │   ├───yallist
    │   ├───yaml
    │   │   ├───browser
    │   │   │   ├───dist
    │   │   │   └───types
    │   │   ├───dist
    │   │   └───types
    │   ├───zod
    │   │   └───lib
    │   │       ├───benchmarks
    │   │       ├───helpers
    │   │       ├───locales
    │   │       └───__tests__
    │   └───zustand
    │       ├───esm
    │       │   ├───middleware
    │       │   ├───react
    │       │   └───vanilla
    │       ├───middleware
    │       ├───react
    │       └───vanilla
    └───public

# Comments

- Be brief and precise → Explain what the code does, not how it works.
- Avoid the obvious → Don’t comment self-explanatory code (i++ // Increments i).
- Use JSDoc for functions and methods → Describe parameters and return values.
- Keep comments updated → If the code changes, update the comments.
- Mark TODOs and FIXMEs → Use // TODO: and // FIXME: for pending tasks.
- Comment complex logic → Explain algorithms or key decisions.
- Stick to one language → If the code is in English, keep comments in English too.
- Don’t overuse comments → Clean code should need minimal commenting.

✨ Extra: Use block comments (/\*_ ... _/) for documentation and inline comments (// ...) for quick notes.
