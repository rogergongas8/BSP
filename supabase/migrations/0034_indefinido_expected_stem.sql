-- Fill expected_stem for the indefinido rows whose stem is not "infinitive minus two letters".
--
-- These rows are seeded as Indef_reg, so game-logic falls back to deriving the stem from the
-- infinitive (seguir -> segu-). That is wrong for the two groups the data already tags via
-- stem_group: the e->i / o->u change in 3s/3pl (seguir -> sigu-, dormir -> durm-) and the
-- -car/-gar/-zar spelling shift in 1s (buscar -> busqu-, empezar -> empec-).
--
-- With the derived stem, "seguieron" reconstructed cleanly and was accepted as correct even
-- though the answer is "siguieron". validate() no longer lets a reconstruction overrule
-- phrase.answer, so those forms are already rejected; setting expected_stem makes the Stem
-- row and the stem hint accurate as well.
--
-- Each stem is taken from the row's own answer minus its person ending, so no conjugation is
-- invented here. Scoped by stem_group, which the seed already classifies.
-- Keyed on sentence (UNIQUE, see 0030_phrases_sentence_unique.sql).

update public.phrases as p
set    expected_stem = v.expected_stem
from (values
  ('Marcos ___ el chiste dos veces, pero sin éxito.', 'repit'),
  ('Los alumnos ___ el ejercicio dos veces para practicar el vocabulario.', 'repit'),
  ('Elena ___ un dolor ligero en la rodilla después de correr demasiado.', 'sint'),
  ('Ricardo y Valvanera ___ mucho no poder venir a la fiesta.', 'sint'),
  ('Pablo ___ el camino junto al río para volver a casa.', 'sigu'),
  ('Los turistas ___ al guía por una calle muy estrecha del casco antiguo.', 'sigu'),
  ('Sofía ___ viajar con una maleta pequeña para no facturar y llegar antes al hotel.', 'prefir'),
  ('Después del instituto, muchos de mis amigos ___ empezar a trabajar antes que ir a la universidad.', 'prefir'),
  ('Andrés ___ sobre la edad de su perro por una razón bastante absurda.', 'mint'),
  ('Los chicos ___ a sus padres para poder organizar una fiesta en su casa el fin de semana.', 'mint'),
  ('Marta, en la universidad, ___ durante tres años en el equipo de natación sincronizada.', 'compit'),
  ('El sábado, mis amigos ___ en un pequeño torneo de fútbol sala.', 'compit'),
  ('Entre Salamanca o Madrid, Gabriel ___ estudiar en Salamanca.', 'elig'),
  ('(Ellas) ___ los asientos del pasillo para poder salir fácilmente.', 'elig'),
  ('El sábado, Paloma ___ en casa de unas amigas.', 'durm'),
  ('La última noche del viaje, Olga y Jaime ___ en el aeropuerto.', 'durm'),
  ('Ayer le (Yo) ___ a la profesora que no puedo estar aquí el día del examen.', 'expliqu'),
  ('Ayer, Guillermo me ___ un gran favor.', 'pid'),
  ('Los alumnos ___ aplazar el examen un día.', 'pid'),
  ('Ayer, después de insistir mucho, Laura ___ hora para la peluquería.', 'consigu'),
  ('La semana pasada, mi hermana y su pareja ___ entradas para el partido.', 'consigu'),
  ('Ayer (Yo) ___ hoteles baratos para el viaje a Japón, pero no hay en estas fechas.', 'busqu'),
  ('Una vez, (Yo) ___ el piano delante de 300 personas.', 'toqu'),
  ('Ayer (Yo) ___ español con unos nuevos amigos.', 'practiqu'),
  ('Ayer (Yo) ___ una foto en Instagram por primera vez.', 'publiqu'),
  ('Me (Yo) ___ en algunas respuestas, pero he aprobado el examen.', 'equivoqu'),
  ('Ayer (Yo) ___ tarde a clase por tercera vez.', 'llegu'),
  ('(Yo) ___ la cuenta con tarjeta.', 'pagu'),
  ('Después de los exámenes, (Yo) ___ a videojuegos tres días seguidos.', 'jugu'),
  ('(Yo) ___ el curso en septiembre.', 'empec'),
  ('Durante el verano (Yo) ___ mucho con mi tesis doctoral.', 'avanc'),
  ('(Yo) ___ la boda de mi mejor amiga. Puedo organizar la tuya.', 'organic'),
  ('Ayer, por primera vez, (Yo) ___ el móvil para pagar.', 'utilic'),
  ('(Yo) ___ los datos con Python.', 'analic')
) as v(sentence, expected_stem)
where p.sentence = v.sentence
  and p.tense    = 'indefinido'
  and p.expected_stem is null;
