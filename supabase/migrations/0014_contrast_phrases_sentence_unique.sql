alter table public.contrast_phrases
  add constraint contrast_phrases_sentence_key unique (sentence);
