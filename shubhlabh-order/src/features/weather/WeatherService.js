import * as Location from 'expo-location';

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
let weatherCache = null;

const WMO_CODE_MAP = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function getConditionString(code) {
  return WMO_CODE_MAP[code] || 'Unknown';
}

function processForecast(hourlyData) {
  if (!hourlyData || !hourlyData.time || hourlyData.time.length === 0) return [];

  const now = new Date();
  const currentHour = now.getHours();
  const today = now.toISOString().split('T')[0];

  const upcomingHours = [];
  
  for (let i = 0; i < hourlyData.time.length; i++) {
    const timeStr = hourlyData.time[i];
    if (timeStr.startsWith(today)) {
      const hour = parseInt(timeStr.split('T')[1].split(':')[0], 10);
      if (hour >= currentHour && hour <= currentHour + 6) { // Look ahead up to 6 hours
        upcomingHours.push({
          time: timeStr,
          hour,
          formattedTime: `${hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)} ${hour >= 12 ? 'PM' : 'AM'}`,
          temp: hourlyData.temperature_2m[i],
          precipProb: hourlyData.precipitation_probability[i],
          precipAmount: hourlyData.precipitation[i]
        });
      }
    }
  }
  return upcomingHours;
}

export async function getWeatherData(preferredLat, preferredLon, preferredName, forceRefresh = false) {
  // Check cache first
  const now = Date.now();
  if (!forceRefresh && weatherCache && (now - weatherCache.fetchedAt < CACHE_DURATION_MS)) {
    // If coords roughly match
    if (Math.abs(weatherCache.latitude - preferredLat) < 0.05 && 
        Math.abs(weatherCache.longitude - preferredLon) < 0.05) {
      return weatherCache.data;
    }
  }

  let lat = preferredLat;
  let lon = preferredLon;
  let locName = preferredName;

  // Fallback to device location if no preferred coords provided
  if (!lat || !lon) {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = location.coords.latitude;
        lon = location.coords.longitude;
        
        // Try reverse geocode to get city name
        const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (geocode && geocode.length > 0) {
          locName = geocode[0].city || geocode[0].region || 'Your Location';
        } else {
          locName = 'Your Location';
        }
      } else {
        throw new Error('Location permission denied and no saved location available.');
      }
    } catch (err) {
      throw new Error('Unable to determine location: ' + err.message);
    }
  }

  if (!locName) {
    locName = 'Saved Location';
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,precipitation_probability,precipitation&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Weather API returned error: ' + response.status);
    }
    const data = await response.json();
    
    if (!data.current_weather) {
      throw new Error('Invalid weather data format');
    }

    const currentConditionCode = data.current_weather.weathercode;
    const currentCondition = getConditionString(currentConditionCode);
    
    const forecast = processForecast(data.hourly);
    
    // Calculate rain probability over the upcoming hours
    let maxRainProb = 0;
    let expectedRainPeriods = [];
    
    for (const hr of forecast) {
      if (hr.precipProb > maxRainProb) {
        maxRainProb = hr.precipProb;
      }
      if (hr.precipProb >= 30) {
        expectedRainPeriods.push(hr.hour);
      }
    }

    let rainPeriodString = null;
    if (expectedRainPeriods.length > 0) {
      const start = Math.min(...expectedRainPeriods);
      const end = Math.max(...expectedRainPeriods);
      
      const formatHr = (h) => `${h > 12 ? h - 12 : (h === 0 ? 12 : h)} ${h >= 12 ? 'PM' : 'AM'}`;
      if (start === end) {
        rainPeriodString = `Around ${formatHr(start)}`;
      } else {
        rainPeriodString = `${formatHr(start)} – ${formatHr(end + 1)}`;
      }
    }

    const result = {
      locationName: locName,
      temperature: data.current_weather.temperature,
      condition: currentCondition,
      rainProbability: maxRainProb,
      forecast: forecast,
      rainPeriodString: rainPeriodString,
      fetchedAt: Date.now()
    };

    // Update cache
    weatherCache = {
      latitude: lat,
      longitude: lon,
      fetchedAt: Date.now(),
      data: result
    };

    return result;

  } catch (err) {
    // If it fails but we have old cache, return old cache
    if (weatherCache && weatherCache.data) {
      return { ...weatherCache.data, isStale: true, error: err.message };
    }
    throw err;
  }
}
