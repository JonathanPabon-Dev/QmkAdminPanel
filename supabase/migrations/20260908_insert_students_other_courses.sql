-- Insertar estudiantes de los cursos 10-2, 11-1 y 11-2.
-- Fuente: Docs/lista10-1.xlsx (pestañas 10-2, 11-1, 11-2).
-- Formato de origen: una sola columna "Estudiante" con el patrón
--   PRIMER_APELLIDO SEGUNDO_APELLIDO PRIMER_NOMBRE SEGUNDO_NOMBRE
--   (las primeras 2 palabras son apellidos; las restantes son nombres).
-- Se OMITEN los estudiantes marcados como Retirado/Desertor.

-- Curso 10-2 (grade_level 10)
INSERT INTO students (id, number_list, course_id, first_name, second_name, first_lastname, second_lastname, grade_level)
VALUES
  (351, 1,  '10-2', 'CAROL',        'MICHELLE',    'BARAJAS',     'PINZON',    10),
  (352, 2,  '10-2', 'LOGAN',        'ANDRES',      'BLANCO',      'HERNANDEZ', 10),
  (732, 3,  '10-2', 'SARAH',        'SOFIA',       'CASALLAS',    'DELGADO',   10),
  (353, 4,  '10-2', 'CRISTHOFFER',  'JHONAIKER',   'CHACON',      'VILLAMIZAR',10),
  (594, 5,  '10-2', 'DULCE',        'MARIA',       'CONTRERAS',   'JIMENEZ',   10),
  (946, 6,  '10-2', 'SUSAN',        'VALERIA',     'ESTEBAN',     'RIVERA',    10),
  (781, 7,  '10-2', 'ANIXIS',       NULL,          'GUZMAN',      'MENDEZ',    10),
  (355, 8,  '10-2', 'WILFRED',      'JOSUE',       'HERRERA',     'TEJADA',    10),
  (356, 9,  '10-2', 'DUVER',        'FABIAN',      'JAIMES',      'LIZARAZO',  10),
  (669, 10, '10-2', 'SHAROLL',      'SOFIA',       'LOZADA',      'GAMBOA',    10),
  (357, 11, '10-2', 'CESAR',        'AUGUSTO',     'MARIN',       'QUEREIGUA', 10),
  (963, 12, '10-2', 'DARLIS',       'SMITH',       'OLIVAREZ',    'PITALUA',   10),
  (359, 13, '10-2', 'VERONICA',     'LUCIA',       'PADILLA',     'AYALA',     10),
  (360, 14, '10-2', 'BENJAMIN',     'ALEXANDRO',   'PINZON',      'NARVAEZ',   10),
  (964, 15, '10-2', 'LUZ',          'DELLY',       'PITALUA',     'ORTEGA',    10),
  (361, 16, '10-2', 'GREYLI',       'YULIANA',     'RICO',        'VILLAMIZAR',10),
  (348, 17, '10-2', 'GIOVANN',      'SEBASTIAN',   'SANTA',       'ARENAS',    10),
  (782, 19, '10-2', 'CAMILO',       NULL,          'VARGAS',      'BELEÑO',    10);

-- Curso 11-1 (grade_level 11)
INSERT INTO students (id, number_list, course_id, first_name, second_name, first_lastname, second_lastname, grade_level)
VALUES
  (366, 1,  '11-1', 'ALEJANDRA',    NULL,          'ACUÑA',       'MARTINEZ',  11),
  (632, 2,  '11-1', 'MARYURI',      NULL,          'CAICEDO',     'ZABALA',    11),
  (371, 3,  '11-1', 'DURIALIS',     'YESSIRE',     'CAMACHO',     'LUQUE',     11),
  (372, 4,  '11-1', 'SHARICK',      'SLENDY',      'CAMARGO',     'BLUN',      11),
  (373, 5,  '11-1', 'VICTOR',       'MANUEL',      'CARVAJAL',    'PEREZ',     11),
  (597, 6,  '11-1', 'ANDREY',       NULL,          'CASTELLANOS', 'CRUZ',      11),
  (629, 7,  '11-1', 'DANIELA',      NULL,          'DAZA',        'LOZANO',    11),
  (376, 8,  '11-1', 'KRISBEL',      'RACHEL',      'DELGADO',     'PACHECO',   11),
  (377, 9,  '11-1', 'VALERIN',      'JULIANA',     'DUARTE',      'GIL',       11),
  (378, 10, '11-1', 'DEISY',        'PAOLA',       'GELVEZ',      'OSORIO',    11),
  (381, 11, '11-1', 'YOIMAR',       'ALEXANDER',   'GRIMALDOS',   'RODRIGUEZ', 11),
  (383, 12, '11-1', 'FERNANDO',     'SEBASTIAN',   'LARA',        'ECHENAGUCIA',11),
  (384, 13, '11-1', 'EDGAR',        'STIVEN',      'LOPEZ',       'DURAN',     11),
  (386, 14, '11-1', 'CAMILO',       NULL,          'MEZA',        'OSORIO',    11),
  (600, 15, '11-1', 'CAMILO',       NULL,          'MORENO',      'JIMENEZ',   11),
  (389, 16, '11-1', 'LAURA',        'VALENTINA',   'ORTIZ',       'JIMENEZ',   11),
  (393, 18, '11-1', 'ANDRES',       'FELIPE',      'REYES',       'FLOREZ',    11),
  (598, 19, '11-1', 'KEYNER',       NULL,          'VASQUEZ',     'ALTAMAR',   11),
  (398, 20, '11-1', 'JUAN',         'SEBASTIAN',   'VELASQUEZ',   'AYALA',     11),
  (599, 21, '11-1', 'YERINSON',     NULL,          'VILLAMIZAR',  'MELO',      11);

-- Curso 11-2 (grade_level 11)
INSERT INTO students (id, number_list, course_id, first_name, second_name, first_lastname, second_lastname, grade_level)
VALUES
  (369, 1,  '11-2', 'YIRLEY',       'STEPHANIE',   'AVENDAÑO',    'RINCON',    11),
  (370, 2,  '11-2', 'KEREN',        'PATRICIA',    'BELTRAN',     'YANEZ',     11),
  (374, 3,  '11-2', 'JOHAN',        'DAVID',       'CASTILLO',    'MEJIA',     11),
  (375, 4,  '11-2', 'MARLIN',       'FABIANA',     'COLON',       'CORRO',     11),
  (379, 5,  '11-2', 'SAULO',        'GABRIEL',     'GOITIA',      'VILLAMIZAR',11),
  (380, 6,  '11-2', 'BRIGGITH',     'CATHERINE',   'GONZALEZ',    'CARRILLO',  11),
  (382, 7,  '11-2', 'NICOLLE',      'DANIELA',     'HERNANDEZ',   'GIL',       11),
  (819, 8,  '11-2', 'SARA',         'SOFIA',       'LIZCANO',     'CHACON',    11),
  (385, 9,  '11-2', 'ANGIE',        'GABRIELA',    'MALUENDAS',   'MAYORGA',   11),
  (783, 11, '11-2', 'NATALIA',      NULL,          'MARTINEZ',    'VILLAMIZAR',11),
  (387, 12, '11-2', 'LUIS',         'ALFONSO',     'MORA',        'SALGADO',   11),
  (388, 13, '11-2', 'CATI',         'YULIE',       'MORALES',     'JIMENEZ',   11),
  (390, 14, '11-2', 'EMILIANA',     'LUCIA',       'PAEZ',        'RODRIGUEZ', 11),
  (392, 15, '11-2', 'LUISA',        'SOFIA',       'PIÑERES',     'GOMEZ',     11),
  (394, 16, '11-2', 'LIBARDO',      NULL,          'RODRIGUEZ',   'RUIDIAZ',   11),
  (395, 17, '11-2', 'RAIMARYS',     'DE LOS ANGELES', 'ROJAS',     'JIMENEZ',   11),
  (872, 18, '11-2', 'STEPHANIE',    NULL,          'SABOGAL',     'CALDAS',    11),
  (831, 19, '11-2', 'YERAI',        'SAITH',       'SANCHEZ',     'BASTILLA',  11),
  (397, 20, '11-2', 'ALAN',         'SEBASTIAN',   'TORREZ',      'MUÑOZ',     11),
  (602, 21, '11-2', 'JUAN',         NULL,          'URDANETA',    'GRANADOS',  11),
  (859, 22, '11-2', 'SHERIL',       'NICOL',       'VILLAMIZAR',  'IBARRA',    11);
