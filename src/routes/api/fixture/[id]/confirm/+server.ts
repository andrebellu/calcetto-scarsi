import { json, error } from "@sveltejs/kit";
export const POST = async ({ params, locals }) => {
  const fixture_id = Number(params.id);
  const supabase = locals.supabase;
  const { error: e } = await supabase
    .from('fixture')
    .update({ status: 'locked', locked_at: new Date().toISOString() })
    .eq('fixture_id', fixture_id);
  if (e) throw error(500, e.message);
  return json({ ok: true });
};
