/*
 * Conexão com o Supabase (banco dos produtos e fotos do painel /paineldoadmin).
 * Pegue os dois valores em Supabase → Project Settings → API Keys / Data API:
 *  - url: "Project URL" (ex.: https://abcdefgh.supabase.co)
 *  - chave: a chave pública "publishable" (sb_publishable_...) ou a antiga "anon"
 * Essa chave pode ficar no site: quem protege os dados são as regras de supabase/setup.sql.
 * NUNCA coloque aqui a chave "secret" / "service_role".
 */
window.KTEC_SUPABASE = {
  url: 'https://girqzqmolifpibldynrw.supabase.co',
  chave: 'sb_publishable_UHLCfJ3doOnQCPHyTaQprA_YulB_8pf',
};
