import {
  GoogleAuthProvider,
  User,
  browserSessionPersistence,
  onAuthStateChanged,
  signInWithPopup,
  setPersistence,
  signOut,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';

export type AppRole = 'FARMER' | 'DRONE_PILOT' | 'OUTLET_MANAGER' | 'ADMIN';

export interface AppUser {
  id: string;
  email: string | null;
  fullName: string;
  mobileNumber: string | null;
  village: string;
  role: AppRole;
  accountStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
}

export interface AdminAccount {
  id: string;
  email: string | null;
  full_name: string;
  mobile_number: string | null;
  village: string;
  role: AppRole;
  account_status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  created_at: string;
}

export interface PilotRoleRequest {
  id: string;
  requested_role: 'DRONE_PILOT';
  status: 'PENDING';
  created_at: string;
  user_id: string;
  full_name: string;
  email: string | null;
  mobile_number: string | null;
  village: string;
}

export interface OperatorAssignment {
  id: string;
  farmerName: string;
  farmName: string;
  village: string;
  crop: string;
  scheduledAt: string;
  status: string;
}

const apiUrl = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/+$/, '');

function requireAuth() {
  if (!firebaseAuth) throw new Error('Authentication is not configured. Contact the site administrator.');
  return firebaseAuth;
}

export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(requireAuth(), callback);
}

export async function signInWithGoogle() {
  const auth = requireAuth();
  await setPersistence(auth, browserSessionPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function getApplicationUser(user: User): Promise<AppUser> {
  return authenticatedRequest<AppUserResponse>('/api/auth/me', user).then((data) => data.user);
}

export async function updateProfile(
  user: User,
  profile: { fullName: string; village: string },
): Promise<AppUser> {
  const data = await authenticatedRequest<AppUserResponse>('/api/auth/profile', user, {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });
  return data.user;
}

export async function requestDronePilotAccess(user: User) {
  return authenticatedRequest<{ status: 'PENDING' | 'APPROVED' }>(
    '/api/auth/role-requests/drone-pilot',
    user,
    { method: 'POST' },
  );
}

export async function getAdminAccounts(user: User) {
  return authenticatedRequest<{ users: AdminAccount[] }>('/api/auth/admin/users', user);
}

export async function getPilotRoleRequests(user: User) {
  return authenticatedRequest<{ requests: PilotRoleRequest[] }>('/api/auth/admin/role-requests', user);
}

export async function getOperatorAssignments(user: User) {
  return authenticatedRequest<{ assignments: OperatorAssignment[] }>('/api/operator/assignments', user);
}

export async function decidePilotRoleRequest(user: User, requestId: string, status: 'APPROVED' | 'REJECTED') {
  return authenticatedRequest<{ success: boolean; status: string }>(
    `/api/auth/admin/role-requests/${requestId}`,
    user,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
}

export async function updateAccountRole(user: User, userId: string, role: AppRole) {
  return authenticatedRequest<{ success: boolean }>(
    `/api/auth/admin/users/${userId}/role`,
    user,
    { method: 'PATCH', body: JSON.stringify({ role }) },
  );
}

export async function logout(user: User) {
  let serverError: unknown;
  try {
    await authenticatedRequest<void>('/api/auth/logout', user, { method: 'POST' });
  } catch (error) {
    serverError = error;
  } finally {
    await signOut(requireAuth());
  }
  if (serverError) throw serverError;
}

async function authenticatedRequest<T>(
  path: string,
  user: User,
  options: RequestInit = {},
): Promise<T> {
  if (!apiUrl) {
    throw new Error('The API server is not configured for this deployment. Set VITE_API_URL to the deployed Khet Rakshak API URL and rebuild the frontend.');
  }
  const token = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Cannot reach the Khet Rakshak API at ${apiUrl}. Start the backend at http://localhost:5000 for local development, or set VITE_API_URL to the deployed API URL. If the API is running, check its CORS FRONTEND_URL setting.`);
  }
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') || '';
  const responseBody = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your sign-in session could not be verified. Please sign in again.');
    }
    const serverMessage = typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody
      ? String(responseBody.message)
      : typeof responseBody === 'string' && responseBody.trim()
        ? responseBody.trim().slice(0, 240)
        : '';
    const requestId = typeof responseBody === 'object' && responseBody !== null && 'requestId' in responseBody
      ? String(responseBody.requestId)
      : response.headers.get('x-request-id');
    if (requestId && response.status >= 500) {
      throw new Error(`${serverMessage || `The API request failed with HTTP ${response.status}.`} Reference: ${requestId}`);
    }
    throw new Error(serverMessage || `The API request failed with HTTP ${response.status} at ${path}.`);
  }

  if (!contentType.includes('application/json')) {
    throw new Error(`The API returned an unexpected response at ${path}. Check that VITE_API_URL points to the backend base URL, without an /api suffix.`);
  }
  if (responseBody === null) throw new Error(`The API returned invalid JSON at ${path}.`);
  return responseBody as T;
}

interface AppUserResponse {
  user: AppUser;
}
