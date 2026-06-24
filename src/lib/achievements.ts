const BASE = '/images/achievement'

// cats[0] = top center, cats[1] = bottom-left, cats[2] = bottom-right, null = no cat
const CATS: Record<string, [string | null, string | null, string | null]> = {
  yellow: [`${BASE}/cat1.png`, `${BASE}/cat2.png`, `${BASE}/cat3.png`],
  blue:   [`${BASE}/cat1.png`, null,               null              ],
  green:  [null,               `${BASE}/cat2.png`, null              ],
  red:    [null,               null,               `${BASE}/cat3.png`],
}

type AchievementColor = keyof typeof CATS

type Achievement = {
  id: string
  nameEs: string
  nameEn: string
  description: string
  badge: string
  cats: [string | null, string | null, string | null]
}

const achievement = (
  id: string,
  nameEs: string,
  nameEn: string,
  description: string,
  color: AchievementColor,
): Achievement => ({
  id,
  nameEs,
  nameEn,
  description,
  badge: `${BASE}/${id}.png`,
  cats: CATS[color],
})

export const ACHIEVEMENTS = {
  paso_a_paso:        achievement('paso_a_paso',        'Paso a Paso',              'Step by Step',           'Complete your first activity.',                    'yellow'),
  cambio_de_look:     achievement('cambio_de_look',     'Cambio de look',           'New Look',               'Change your profile picture.',                     'red'),
  cata_juegos:        achievement('cata_juegos',         'Cata-Juegos',              'Game Taster',            'Try all 6 game types.',                            'blue'),
  viajero_del_tiempo: achievement('viajero_del_tiempo', 'Viajero del tiempo',       'Time Traveller',         'Complete 500 items.',                              'yellow'),
  no_paras:           achievement('no_paras',            'No Paras',                 'No Stopping',            'Complete 100 items without skipping.',             'green'),
  exterminador:       achievement('exterminador',        'Exterminador de Errores',  'Error Exterminator',     'Fix 100 errors from My Errors.',                   'green'),
  ni_un_fallo:        achievement('ni_un_fallo',         'Ni un Fallo',              'Clean Run',              'Complete 10 activities with no mistakes.',         'yellow'),
  pequeno_gigante:    achievement('pequeno_gigante',     'Pequeño Gigante',          'Tiny Giant',             'Complete 100 mini-sessions.',                      'red'),
  hola_de_nuevo:      achievement('hola_de_nuevo',       'Hola de Nuevo',            'Hi Again',               'Open the app 7 days in a row.',                   'blue'),
  reto_aceptado:      achievement('reto_aceptado',       'Reto Aceptado',            'Challenge Accepted',     'Complete 30 daily challenges.',                    'yellow'),
  vaya_semana:        achievement('vaya_semana',          'Vaya Semana',              'What a Week',            'Complete the daily challenge 7 days in a row.',   'yellow'),
  podio:              achievement('podio',                "Po'dio'",                  'Oh My Podium',           'Finish in the top 3 in 10 multiplayer games.',    'blue'),
  campeones:          achievement('campeones',            'Campeones, Olé, Olé, Olé', 'Champions, Olé Olé Olé', 'Win 5 multiplayer games.',                       'green'),
  senor_del_tiempo:   achievement('senor_del_tiempo',    'Señor del Tiempo',         'Time Lord',              'Complete 1,500 items.',                            'blue'),
  vaya_leyenda:       achievement('vaya_leyenda',        'Vaya Leyenda',             'What a Legend',          'Complete 30 activities with no mistakes.',         'red'),
} as const

export type AchievementId = keyof typeof ACHIEVEMENTS
export type { Achievement }
