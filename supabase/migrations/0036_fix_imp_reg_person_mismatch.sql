-- Corrige el campo `person` de una frase de imperfecto regular mal etiquetada.
--
-- "En la universidad, Diego, Héctor, Claudia y yo ___ juntos todos los días."
-- El sujeto termina en "y yo", así que es *nosotros* (1pl), y la respuesta guardada
-- ("comíamos") es la correcta. Pero `person` decía '3pl'.
--
-- El error viene del propio origen: en Imperfecto_imp_reg_7_morfo_revised.xlsx la fila
-- lleva "Infinitivo: comer, nosotros" y "Respuesta: comíamos", pero "P/N: 3pl".
--
-- `person` alimenta la corrección: la fila Person/Number y su pista se evalúan contra la
-- terminación de esa persona, de modo que con '3pl' el juego esperaba "comían" y le decía
-- al alumno que su Person/Number era incorrecta justo cuando escribía la respuesta buena.
--
-- Comprueba el valor actual en el WHERE para que la migración sea idempotente.
UPDATE phrases SET person = '1pl'
  WHERE id = '7e67aab2-9f60-49d4-8b36-f4d9d467388a'
    AND answer = 'comíamos'
    AND person = '3pl';
