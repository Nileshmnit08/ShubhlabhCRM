// Mocked calculateDistanceKm for pure logic testing
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function evaluateGeofence(loc, geofenceState, GEOFENCE_RADIUS_KM = 0.05, MIN_ACCURACY_M = 50) {
  const eventsToTrigger = [];
  let stateChanged = false;

  if (!loc || !loc.coords || typeof loc.coords.accuracy !== 'number' || loc.coords.accuracy > MIN_ACCURACY_M) {
    return { geofenceState, eventsToTrigger, stateChanged };
  }

  for (const customerId of Object.keys(geofenceState)) {
    const customer = geofenceState[customerId];
    
    if (customer.last_processed_timestamp && loc.timestamp <= customer.last_processed_timestamp) {
       continue; 
    }

    const distanceKm = calculateDistanceKm(
      loc.coords.latitude, loc.coords.longitude,
      customer.latitude, customer.longitude
    );

    if (distanceKm == null) continue;

    customer.last_processed_timestamp = loc.timestamp;
    stateChanged = true;

    let newStatus = customer.status;
    let eventToTrigger = null;

    if (distanceKm <= GEOFENCE_RADIUS_KM && (customer.status === 'OUTSIDE' || customer.status === 'UNKNOWN')) {
      newStatus = 'INSIDE';
      eventToTrigger = 'ENTER';
    } else if (distanceKm > GEOFENCE_RADIUS_KM && customer.status === 'INSIDE') {
      newStatus = 'OUTSIDE';
      eventToTrigger = 'EXIT';
    } else if (distanceKm > GEOFENCE_RADIUS_KM && customer.status === 'UNKNOWN') {
      newStatus = 'OUTSIDE';
    }

    if (eventToTrigger) {
      eventsToTrigger.push({
        customer_id: customer.id,
        event_type: eventToTrigger,
        distance_m: Math.round(distanceKm * 1000)
      });
      customer.status = newStatus;
    } else if (newStatus !== customer.status) {
      customer.status = newStatus;
    }
  }

  return { geofenceState, eventsToTrigger, stateChanged };
}

describe('Geofence State Machine Tests', () => {
  const GEOFENCE_RADIUS_KM = 0.05;
  const MIN_ACCURACY_M = 50;
  
  const createMockCustomer = (status, lastTs = 0) => ({
    id: 'cust-1',
    latitude: 22.0,
    longitude: 75.0,
    status: status,
    last_processed_timestamp: lastTs
  });

  const createMockLoc = (distanceMeters, accuracy, timestamp) => {
    // 1 deg lat is ~111km, so 1 meter is ~0.000009 degrees
    const offsetDegrees = distanceMeters * 0.000009;
    return {
      timestamp,
      coords: {
        latitude: 22.0 + offsetDegrees,
        longitude: 75.0,
        accuracy: accuracy
      }
    };
  };

  it('Accuracy rejection (> 50m)', () => {
    const state = { 'cust-1': createMockCustomer('UNKNOWN') };
    const loc = createMockLoc(10, 51, 1000); 
    const result = evaluateGeofence(loc, state, GEOFENCE_RADIUS_KM, MIN_ACCURACY_M);
    expect(result.eventsToTrigger.length).toBe(0);
    expect(result.stateChanged).toBe(false);
  });

  it('Missing accuracy -> rejection', () => {
    const state = { 'cust-1': createMockCustomer('UNKNOWN') };
    const loc = createMockLoc(10, undefined, 1000);
    const result = evaluateGeofence(loc, state, GEOFENCE_RADIUS_KM, MIN_ACCURACY_M);
    expect(result.eventsToTrigger.length).toBe(0);
  });

  it('UNKNOWN -> INSIDE = ENTER', () => {
    const state = { 'cust-1': createMockCustomer('UNKNOWN') };
    const loc = createMockLoc(40, 10, 1000); 
    const result = evaluateGeofence(loc, state, GEOFENCE_RADIUS_KM, MIN_ACCURACY_M);
    expect(result.eventsToTrigger.length).toBe(1);
    expect(result.eventsToTrigger[0].event_type).toBe('ENTER');
    expect(result.geofenceState['cust-1'].status).toBe('INSIDE');
  });

  it('UNKNOWN -> OUTSIDE = no EXIT', () => {
    const state = { 'cust-1': createMockCustomer('UNKNOWN') };
    const loc = createMockLoc(60, 10, 1000); 
    const result = evaluateGeofence(loc, state, GEOFENCE_RADIUS_KM, MIN_ACCURACY_M);
    expect(result.eventsToTrigger.length).toBe(0);
    expect(result.geofenceState['cust-1'].status).toBe('OUTSIDE');
  });

  it('INSIDE -> INSIDE = no event', () => {
    const state = { 'cust-1': createMockCustomer('INSIDE') };
    const loc = createMockLoc(30, 10, 1000); 
    const result = evaluateGeofence(loc, state, GEOFENCE_RADIUS_KM, MIN_ACCURACY_M);
    expect(result.eventsToTrigger.length).toBe(0);
    expect(result.geofenceState['cust-1'].status).toBe('INSIDE');
  });

  it('INSIDE -> OUTSIDE = EXIT', () => {
    const state = { 'cust-1': createMockCustomer('INSIDE') };
    const loc = createMockLoc(60, 10, 1000); 
    const result = evaluateGeofence(loc, state, GEOFENCE_RADIUS_KM, MIN_ACCURACY_M);
    expect(result.eventsToTrigger.length).toBe(1);
    expect(result.eventsToTrigger[0].event_type).toBe('EXIT');
    expect(result.geofenceState['cust-1'].status).toBe('OUTSIDE');
  });

  it('OUTSIDE -> OUTSIDE = no event', () => {
    const state = { 'cust-1': createMockCustomer('OUTSIDE') };
    const loc = createMockLoc(100, 10, 1000); 
    const result = evaluateGeofence(loc, state, GEOFENCE_RADIUS_KM, MIN_ACCURACY_M);
    expect(result.eventsToTrigger.length).toBe(0);
    expect(result.geofenceState['cust-1'].status).toBe('OUTSIDE');
  });

  it('OUTSIDE -> INSIDE = ENTER', () => {
    const state = { 'cust-1': createMockCustomer('OUTSIDE') };
    const loc = createMockLoc(49, 10, 1000); 
    const result = evaluateGeofence(loc, state, GEOFENCE_RADIUS_KM, MIN_ACCURACY_M);
    expect(result.eventsToTrigger.length).toBe(1);
    expect(result.eventsToTrigger[0].event_type).toBe('ENTER');
    expect(result.geofenceState['cust-1'].status).toBe('INSIDE');
  });

  it('Duplicate processing (same timestamp)', () => {
    const state = { 'cust-1': createMockCustomer('OUTSIDE', 1000) };
    const loc = createMockLoc(10, 10, 1000); 
    const result = evaluateGeofence(loc, state, GEOFENCE_RADIUS_KM, MIN_ACCURACY_M);
    expect(result.eventsToTrigger.length).toBe(0);
    expect(result.stateChanged).toBe(false);
  });

});
