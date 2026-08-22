-- Quita el pronombre átono duplicado de las opciones de contraste.
--
-- En estas frases el pronombre ya está escrito en el propio enunciado, justo delante
-- del hueco ("¿Os ___ pronto…?"), pero la opción también lo llevaba ("os fuisteis"),
-- así que el jugador leía "¿Os os fuisteis pronto…?".
--
-- Sólo afecta a las filas donde el pronombre está duplicado. Las demás opciones que
-- empiezan por pronombre son correctas y se dejan intactas: cuando el enunciado NO lo
-- lleva ("La cola ___ larga, así que ___"), la opción tiene que aportarlo ("me fui").
--
-- Cada UPDATE comprueba el valor actual en el WHERE, de modo que la migración es
-- idempotente y no pisa nada si el texto ya fue corregido por otra vía.

-- "Ayer Javier ___ la mesa mientras yo me ___."  (hueco 2: la frase ya dice "me")
--   "me duché" -> "duché"   |   "me duchaba" -> "duchaba"
UPDATE contrast_phrases SET option_a_2 = 'duché', option_b_2 = 'duchaba'
  WHERE id = '103d0e2e-3924-4f22-a4d8-d64dbb323013' AND option_a_2 = 'me duché' AND option_b_2 = 'me duchaba';

-- "Ayer te ___ la chaqueta que te ___, ¿verdad?"  (hueco 1: la frase ya dice "te")
--   "te pusiste" -> "pusiste"   |   "te ponías" -> "ponías"
UPDATE contrast_phrases SET option_a_1 = 'pusiste', option_b_1 = 'ponías'
  WHERE id = '212686c3-2a5e-4469-9ac5-ecb9b3675a89' AND option_a_1 = 'te pusiste' AND option_b_1 = 'te ponías';

-- "Me ___ un "brain freeze" mientras ___ un helado."  (hueco 1: la frase ya dice "Me")
--   "me dio" -> "dio"   |   "me daba" -> "daba"
UPDATE contrast_phrases SET option_a_1 = 'dio', option_b_1 = 'daba'
  WHERE id = '3585c59f-19b8-4375-b041-202d98388374' AND option_a_1 = 'me dio' AND option_b_1 = 'me daba';

-- "___ preocupado, pero tu mensaje me ___."  (hueco 2: la frase ya dice "me")
--   "me tranquilizó" -> "tranquilizó"   |   "me tranquilizaba" -> "tranquilizaba"
UPDATE contrast_phrases SET option_a_2 = 'tranquilizó', option_b_2 = 'tranquilizaba'
  WHERE id = '690a0858-cf3c-4e30-97e0-e85d3d0388fa' AND option_a_2 = 'me tranquilizó' AND option_b_2 = 'me tranquilizaba';

-- "¿Os ___ pronto porque todos ___ cansados?"  (hueco 1: la frase ya dice "Os")
--   "os fuisteis" -> "fuisteis"   |   "os ibais" -> "ibais"
UPDATE contrast_phrases SET option_a_1 = 'fuisteis', option_b_1 = 'ibais'
  WHERE id = '6f03ffd2-e3a5-4b96-aa3b-0a2da7bf0510' AND option_a_1 = 'os fuisteis' AND option_b_1 = 'os ibais';

-- "Como el sofá ___ cómodo, me ___ allí un rato."  (hueco 2: la frase ya dice "me")
--   "me quedé" -> "quedé"   |   "me quedaba" -> "quedaba"
UPDATE contrast_phrases SET option_a_2 = 'quedé', option_b_2 = 'quedaba'
  WHERE id = '7dd8a952-ba4f-4541-a88a-1365ebaa7f37' AND option_a_2 = 'me quedé' AND option_b_2 = 'me quedaba';

-- "Me ___ pronto porque ___ cansado."  (hueco 1: la frase ya dice "Me")
--   "me fui" -> "fui"   |   "me iba" -> "iba"
UPDATE contrast_phrases SET option_a_1 = 'fui', option_b_1 = 'iba'
  WHERE id = 'c6fa1847-4c03-48a9-b6c7-3240bba46d05' AND option_a_1 = 'me fui' AND option_b_1 = 'me iba';

-- "Yo ___ cansado, así que me ___ temprano."  (hueco 2: la frase ya dice "me")
--   "me acosté" -> "acosté"   |   "me acostaba" -> "acostaba"
UPDATE contrast_phrases SET option_a_2 = 'acosté', option_b_2 = 'acostaba'
  WHERE id = 'fe2d68fd-e894-4242-b7f2-cd8c3750fd28' AND option_a_2 = 'me acosté' AND option_b_2 = 'me acostaba';

