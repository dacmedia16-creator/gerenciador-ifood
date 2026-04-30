
-- Revoga execução pública das funções de busca; mantém apenas authenticated
REVOKE EXECUTE ON FUNCTION public.match_knowledge(vector, int, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_cases(vector, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_knowledge(vector, int, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_cases(vector, int, text) TO authenticated;

-- training_examples: policy explícita negando todo acesso de usuários (só service role bypassa RLS)
CREATE POLICY training_examples_no_user_access ON public.training_examples
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
