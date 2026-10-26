// RobinJr and Community both sign in through the common Robin login. Update
// the account that actually verified that login, including legacy accounts.
export function passwordChangeEndpoint(identity) {
  if (identity?.auth_source !== 'external_client') return '/portal/api/auth/change-password';
  if (identity.external_source === 'robinjr') return '/robinjr/api/auth/change-password';
  if (identity.external_source === 'community') return '/therobinplan/api/auth/change-password';
  return null;
}

function responseError(response, data) {
  const error = new Error(data?.error || `HTTP ${response.status}`);
  error.status = response.status;
  error.data = data;
  return error;
}

export async function changeCommonPassword(currentPassword, newPassword) {
  const me = await fetch('/portal/api/me', { credentials: 'same-origin', cache: 'no-store' });
  if (!me.ok) throw responseError(me, await me.json().catch(() => null));
  const endpoint = passwordChangeEndpoint(await me.json());
  if (!endpoint) throw new Error('unsupported_identity_source');
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw responseError(response, data);
  return data;
}
