import type { DeliveryTrip, DeliveryStop, DeliveryForm } from '../types/erpnext';

// We now use a custom Node.js server in production that proxies /api, so we always use relative path
const API_URL = '';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 120000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server is taking too long to respond.');
    }
    throw err;
  }
}

// Simple memory cache for GET requests to dramatically speed up navigation
const apiCache = new Map<string, { data: any, timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// --- Generic Helpers ---

async function fetchResource<T>(doctype: string, filters?: any, fields: string[] = ['*'], orderBy: string = 'creation desc', limit: number = 50): Promise<T[]> {
  const queryParams = new URLSearchParams();
  if (fields.length) queryParams.append('fields', JSON.stringify(fields));
  if (filters && filters.length) queryParams.append('filters', JSON.stringify(filters));
  if (orderBy) queryParams.append('order_by', orderBy);
  if (limit) queryParams.append('limit_page_length', limit.toString());
  
  const url = `${API_URL}/api/resource/${encodeURIComponent(doctype)}?${queryParams.toString()}`;
  
  const response = await fetchWithTimeout(url, { headers: getHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${doctype}: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || [];
}

export async function getDocument<T>(doctype: string, name: string): Promise<T> {
  const url = `${API_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
  
  // Check Cache
  if (apiCache.has(url)) {
    const cached = apiCache.get(url)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  }

  // Check In-Flight Requests
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!;
  }

  const fetchPromise = (async () => {
    const response = await fetchWithTimeout(url, { headers: getHeaders() });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${doctype} ${name}: ${response.statusText}`);
    }
    const data = await response.json();
    apiCache.set(url, { data: data.data, timestamp: Date.now() });
    return data.data;
  })();

  inFlightRequests.set(url, fetchPromise);
  
  try {
    const result = await fetchPromise;
    return result;
  } finally {
    inFlightRequests.delete(url);
  }
}

async function createDocument<T>(doctype: string, payload: any): Promise<T> {
  const url = `${API_URL}/api/resource/${encodeURIComponent(doctype)}`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.text();
    console.error(`[API Error] POST ${url} - Status: ${response.status} - Body:`, errorData);
    throw new Error(`[HTTP ${response.status}] ${errorData}`);
  }
  const data = await response.json();
  return data.data;
}

export async function updateDocument<T>(doctype: string, name: string, payload: any): Promise<T> {
  const url = `${API_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
  const response = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Failed to update ${doctype} ${name}: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data;
}


// --- Auth & Specific API Methods ---

export async function login(usr: string, pwd: string) {
  const response = await fetchWithTimeout(`${API_URL}/api/method/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ usr, pwd })
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("Non-JSON Response:", text);
    throw new Error(`Server returned HTML (Status ${response.status}). Check API URL or Proxy config.`);
  }

  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
}

export async function getLoggedUser() {
  const response = await fetchWithTimeout(`${API_URL}/api/method/frappe.auth.get_logged_user`, {
    headers: getHeaders()
  });
  if (!response.ok) return null;
  return await response.json();
}

export async function getEmployeeDetails(userEmail: string): Promise<{ name: string, company: string | null } | null> {
  try {
    const employees = await fetchResource<any>('Employee', [['user_id', '=', userEmail]], ['name', 'company']);
    if (employees.length > 0) {
      return {
        name: employees[0].name,
        company: employees[0].company || null
      };
    }
  } catch (err) {
    console.error("Failed to fetch employee details:", err);
  }
  return null;
}


export async function getMyDeliveryTrips(driverId: string): Promise<DeliveryTrip[]> {
  // If driverId is provided, filter by delivered_by, otherwise just get open trips
  const filters: any[] = [];
  if (driverId) {
    filters.push(['delivered_by', '=', driverId]);
  }
  
  // Only get trips that are not completed or cancelled, or just sort by newest
  filters.push(['status', 'in', ['Scheduled', 'In Transit', 'Draft']]);
  
  return fetchResource<DeliveryTrip>('Delivery Trip', filters, ['name', 'driver', 'driver_name', 'status', 'company', 'departure_time'], 'creation desc', 50);
}

export async function getDeliveryTripDetails(tripId: string): Promise<DeliveryTrip> {
  return getDocument<DeliveryTrip>('Delivery Trip', tripId);
}

// In standard ERPNext, Delivery Stop is usually a child table of Delivery Trip.
// If it's a separate DocType, we can fetch it, otherwise we read the trip's children.
export async function getDeliveryStopsForTrip(tripId: string): Promise<DeliveryStop[]> {
  // Directly read from the Delivery Trip child table to avoid 403 Forbidden error in console
  const tripDetails: any = await getDeliveryTripDetails(tripId);
  if (!tripDetails) return [];
  return tripDetails.delivery_stops || [];
}

export async function startDeliveryStop(stopId: string): Promise<void> {
  // Update the stop status to "In Progress"
  await updateDocument('Delivery Stop', stopId, { status: 'In Progress' });
}

export async function completeDeliveryStop(tripId: string, stopId: string): Promise<void> {
  const url = `${API_URL}/api/resource/Delivery Trip/${encodeURIComponent(tripId)}`;
  const response = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      delivery_stops: [
        {
          name: stopId,
          visited: 1
        }
      ]
    })
  });
  if (!response.ok) {
    throw new Error(`Failed to update Delivery Trip ${tripId}: ${response.statusText}`);
  }
}

export function clearApiCache() {
  apiCache.clear();
}

export async function submitDeliveryForm(form: Partial<DeliveryForm>): Promise<DeliveryForm> {
  return createDocument<DeliveryForm>('Delivery Form', form);
}

export async function getOperationOrderFromStockFulfillment(fulfillmentId: string): Promise<string | null> {
  const filters = encodeURIComponent(JSON.stringify({ name: fulfillmentId }));
  const url = `${API_URL}/api/method/frappe.client.get_value?doctype=Stock%20Fulfillment&filters=${filters}&fieldname=operation_order`;
  
  // Check Cache
  if (apiCache.has(url)) {
    const cached = apiCache.get(url)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  }

  // Check In-Flight
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!;
  }

  const fetchPromise = (async () => {
    const response = await fetchWithTimeout(url, { headers: getHeaders() });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.message?.operation_order || null;
    apiCache.set(url, { data: result, timestamp: Date.now() });
    return result;
  })();

  inFlightRequests.set(url, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(url);
  }
}

export async function getOperationOrderDetails(orderId: string): Promise<any> {
  return getDocument<any>('Operation Order', orderId);
}

export type TrackingSessionPayload = {
  sessionId: string;
  tripId: string;
  stopId?: string;
  driverId: string;
  driverName?: string;
  company?: string;
  direction?: string;
};

export type TrackingLocationPayload = {
  sessionId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  recordedAt?: string;
};

async function postTracking(path: string, payload: Record<string, unknown>) {
  const response = await fetchWithTimeout(path, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tracking API error (${response.status}): ${text || response.statusText}`);
  }
  return response.json();
}

export async function startTrackingSession(payload: TrackingSessionPayload) {
  return postTracking('/tracking/session/start', payload);
}

export async function sendTrackingLocation(payload: TrackingLocationPayload) {
  return postTracking('/tracking/location', payload);
}

export async function endTrackingSession(sessionId: string, driverId: string) {
  return postTracking('/tracking/session/end', {
    sessionId,
    driverId,
    endedAt: new Date().toISOString()
  });
}
