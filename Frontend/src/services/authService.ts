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
  farmerId: string | null;
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

export interface OperatorFarm {
  id: string;
  name: string;
  location: string;
  crop: string;
  areaAcres: number;
}

export interface OperatorFarmer {
  farmerId: string;
  fullName: string;
  village: string;
  farms: OperatorFarm[];
}

export interface DroneUploadResult {
  clientImageId: string;
  imageId?: string;
  filename: string;
  status: 'uploaded' | 'failed';
  message?: string;
}

export interface DroneUploadResponse {
  batchId: string;
  farmer: Pick<OperatorFarmer, 'farmerId' | 'fullName' | 'village'>;
  farm: Pick<OperatorFarm, 'id' | 'name'>;
  uploadedCount: number;
  expectedCount: number;
  status: 'UPLOADING' | 'COMPLETED' | 'PARTIAL';
  results: DroneUploadResult[];
}

export interface DroneUploadBatch {
  id: string;
  status: string;
  expectedImageCount: number;
  uploadedCount: number;
  createdAt: string;
  completedAt: string | null;
  farmerId: string;
  farmerName: string;
  farmName: string;
  location: string;
  crop: string;
}

export interface FarmerDroneImage {
  id: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
  capturedAt: string | null;
  gps: { latitude: number; longitude: number } | null;
  analysisStatus: string;
  uploadedAt: string;
  farm: { id: string; name: string; location: string; crop: string };
  batchId: string;
}

export interface DroneUploadFile {
  file: File;
  clientImageId: string;
}

export type CropType = 'cotton' | 'turmeric' | 'other' | 'unknown';
export type CropTypeSource = 'user_selected' | 'filename_hint' | 'unknown';

export interface CropAnalysis {
  id: string;
  createdAt: string;
  filename: string;
  fileSizeBytes: number;
  cropType: CropType;
  cropTypeSource: CropTypeSource;
  image: {
    format: string;
    width: number;
    height: number;
    qualityStatus: 'readable' | 'warning';
    warnings: string[];
  };
  analysisStatus: 'model_unavailable' | 'unsupported_crop';
  resultType: 'image_quality_only';
  prediction: null;
  confidence: null;
  model: null;
  warnings: string[];
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

export async function findOperatorFarmer(user: User, farmerId: string): Promise<OperatorFarmer> {
  const response = await authenticatedRequest<{ farmer: OperatorFarmer }>(
    `/api/operator/farmers/${encodeURIComponent(farmerId)}`,
    user,
  );
  return response.farmer;
}

export async function createDroneUpload(
  user: User,
  params: {
    farmerId: string;
    farmId: string;
    batchId: string;
    expectedImageCount: number;
    files: DroneUploadFile[];
  },
  onProgress: (progress: number) => void,
): Promise<DroneUploadResponse> {
  if (!apiUrl) {
    throw new Error('The API server is not configured for this deployment. Set VITE_API_URL and rebuild the frontend.');
  }
  const token = await user.getIdToken();
  const formData = new FormData();
  formData.append('farmerId', params.farmerId);
  formData.append('farmId', params.farmId);
  formData.append('batchId', params.batchId);
  formData.append('expectedImageCount', String(params.expectedImageCount));
  for (const item of params.files) {
    formData.append('images', item.file, item.file.name);
    formData.append('imageIds', item.clientImageId);
  }
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${apiUrl}/api/operator/drone-uploads`);
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error(`Cannot reach the Khet Rakshak API at ${apiUrl}. Check the API URL and CORS settings.`));
    request.onabort = () => reject(new Error('The upload was cancelled before the server confirmed completion.'));
    request.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        reject(new Error('The API returned an unexpected response for the image upload.'));
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        const message = typeof body === 'object' && body !== null && 'message' in body
          ? String(body.message)
          : `Image upload failed with HTTP ${request.status}.`;
        reject(new Error(message));
        return;
      }
      onProgress(100);
      resolve(body as DroneUploadResponse);
    };
    request.send(formData);
  });
}

export async function getOperatorDroneUploads(user: User, farmerId = '') {
  const query = farmerId ? `?farmerId=${encodeURIComponent(farmerId)}` : '';
  return authenticatedRequest<{ uploads: DroneUploadBatch[] }>(
    `/api/operator/drone-uploads${query}`,
    user,
  );
}

export async function getFarmerFarms(user: User): Promise<OperatorFarm[]> {
  const response = await authenticatedRequest<{ farms: OperatorFarm[] }>('/api/farmer/farms', user);
  return response.farms;
}

export async function saveFarmerFarm(
  user: User,
  farm: { name: string; location: string; crop: string; areaAcres: number },
): Promise<OperatorFarm> {
  const response = await authenticatedRequest<{ farm: OperatorFarm }>('/api/farmer/farms', user, {
    method: 'POST',
    body: JSON.stringify(farm),
  });
  return response.farm;
}

export async function getFarmerDroneImages(user: User): Promise<FarmerDroneImage[]> {
  const response = await authenticatedRequest<{ images: FarmerDroneImage[] }>('/api/farmer/drone-images', user);
  return response.images;
}

export async function getDroneImageUrl(user: User, imageId: string, audience: 'farmer' | 'operator') {
  const endpoint = audience === 'farmer' ? '/api/farmer/drone-images' : '/api/operator/drone-images';
  return authenticatedRequest<{ url: string; expiresInSeconds: number }>(
    `${endpoint}/${encodeURIComponent(imageId)}/url`,
    user,
  );
}

export async function submitCropImage(
  user: User,
  file: File,
  cropType: CropType,
  cropTypeSource: CropTypeSource,
): Promise<CropAnalysis> {
  const formData = new FormData();
  formData.append('image', file, file.name);
  formData.append('cropType', cropType);
  formData.append('cropTypeSource', cropTypeSource);
  const response = await authenticatedRequest<{ analysis: CropAnalysis }>(
    '/api/crop-analysis',
    user,
    { method: 'POST', body: formData },
  );
  return response.analysis;
}

export async function getCropAnalysis(user: User, analysisId: string): Promise<CropAnalysis> {
  const response = await authenticatedRequest<{ analysis: CropAnalysis }>(
    `/api/crop-analysis/${encodeURIComponent(analysisId)}`,
    user,
  );
  return response.analysis;
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
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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
