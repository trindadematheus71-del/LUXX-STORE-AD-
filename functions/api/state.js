import { json } from '../_lib/auth.js';

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB
      .prepare(
        'SELECT state_json FROM store_state WHERE id = 1'
      )
      .first();

    if (!result) {
      return json({
        ok: true,
        state: null
      }, 200, {
        'Cache-Control': 'no-store'
      });
    }

    const state = JSON.parse(result.state_json);

    return json({
      ok: true,
      state
    }, 200, {
      'Cache-Control': 'no-store'
    });
  } catch {
    return json({
      ok: false,
      error: 'Não foi possível carregar os dados da loja.'
    }, 500, {
      'Cache-Control': 'no-store'
    });
  }
}
