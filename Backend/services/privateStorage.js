const MAX_STORAGE_RESPONSE_BYTES = 16 * 1024;

function getStorageConfiguration(environment = process.env) {
  const baseUrl = environment.SUPABASE_STORAGE_URL || environment.SUPABASE_URL;
  const serviceKey = environment.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = environment.SUPABASE_STORAGE_BUCKET;

  if (!baseUrl || !serviceKey || !bucket) {
    const error = new Error("Private image storage is not configured.");
    error.statusCode = 503;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    const error = new Error("Private image storage is not configured correctly.");
    error.statusCode = 503;
    throw error;
  }
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    const error = new Error("Private image storage is not configured correctly.");
    error.statusCode = 503;
    throw error;
  }

  return { baseUrl: parsed.origin, serviceKey, bucket };
}

async function storageRequest(path, { method, body, contentType } = {}, environment = process.env) {
  const { baseUrl, serviceKey } = getStorageConfiguration(environment);
  let response;
  try {
    response = await fetch(`${baseUrl}/storage/v1${path}`, {
      method,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      ...(body === undefined ? {} : { body }),
    });
  } catch {
    const error = new Error("Private image storage could not be reached.");
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok) {
    const error = new Error("Private image storage rejected the operation.");
    error.statusCode = response.status >= 500 ? 502 : 502;
    throw error;
  }

  const text = await response.text();
  if (text.length > MAX_STORAGE_RESPONSE_BYTES) {
    const error = new Error("Private image storage returned an invalid response.");
    error.statusCode = 502;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

function encodeStorageKey(storageKey) {
  return storageKey.split("/").map(encodeURIComponent).join("/");
}

async function uploadPrivateImage({ storageKey, buffer, contentType }) {
  const { bucket } = getStorageConfiguration();
  const key = encodeStorageKey(storageKey);
  await storageRequest(
    `/object/${encodeURIComponent(bucket)}/${key}`,
    { method: "POST", body: buffer, contentType },
  );
}

async function deletePrivateImage(storageKey) {
  const { bucket } = getStorageConfiguration();
  await storageRequest(
    `/object/${encodeURIComponent(bucket)}`,
    {
      method: "DELETE",
      body: JSON.stringify({ prefixes: [storageKey] }),
      contentType: "application/json",
    },
  );
}

async function createPrivateImageUrl(storageKey, expiresIn = 300) {
  const { baseUrl, bucket } = getStorageConfiguration();
  const result = await storageRequest(
    `/object/sign/${encodeURIComponent(bucket)}/${encodeStorageKey(storageKey)}`,
    { method: "POST", body: JSON.stringify({ expiresIn }), contentType: "application/json" },
  );
  if (!result || typeof result.signedURL !== "string") {
    const error = new Error("Private image storage returned an invalid signed URL.");
    error.statusCode = 502;
    throw error;
  }
  return new URL(result.signedURL, `${baseUrl}/storage/v1`).toString();
}

module.exports = {
  createPrivateImageUrl,
  deletePrivateImage,
  getStorageConfiguration,
  uploadPrivateImage,
};
