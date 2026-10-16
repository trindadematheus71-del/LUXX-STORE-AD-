import { clearSessionCookie, json } from '../_lib/auth.js';

export async function onRequestPost() {
  return json(
    { success: true },
    200,
    { 'Set-Cookie': clearSessionCookie() }
  );
}
