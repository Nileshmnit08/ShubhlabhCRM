import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { CloudRain, Cloud, Sun, MapPin, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { getWeatherData } from './WeatherService';

export default function HomeWeatherWidget({ shopLocation, deliveryLocation }) {
  const navigation = useNavigation();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read threshold from env or default to 70
  const RAIN_THRESHOLD = process.env.EXPO_PUBLIC_RAIN_ALERT_PROBABILITY 
    ? parseInt(process.env.EXPO_PUBLIC_RAIN_ALERT_PROBABILITY, 10) 
    : 70;

  const fetchWeather = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Priority: Shop -> Delivery
      let lat = null;
      let lon = null;
      let locName = null;

      if (shopLocation && shopLocation.latitude) {
        lat = shopLocation.latitude;
        lon = shopLocation.longitude;
        locName = shopLocation.city || 'Shop Location';
      } else if (deliveryLocation && deliveryLocation.latitude) {
        lat = deliveryLocation.latitude;
        lon = deliveryLocation.longitude;
        locName = deliveryLocation.city || 'Delivery Location';
      }

      const data = await getWeatherData(lat, lon, locName, forceRefresh);
      setWeather(data);
    } catch (err) {
      console.warn('Weather fetch failed:', err);
      setError('Weather information is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWeather(false);
    }, [shopLocation, deliveryLocation])
  );

  if (loading && !weather) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && !weather) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchWeather(true)}>
          <RefreshCw size={16} color={theme.colors.primary} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!weather) return null;

  const showRainAlert = weather.rainProbability >= RAIN_THRESHOLD;

  const handlePress = () => {
    navigation.navigate('WeatherDetails', { weather });
  };

  const timeDiffMins = Math.floor((Date.now() - weather.fetchedAt) / 60000);
  const updatedText = timeDiffMins === 0 ? 'Just now' : `${timeDiffMins} min ago`;

  return (
    <View style={styles.container}>
      {/* Main Weather Card */}
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
        <View style={styles.header}>
          <View style={styles.locationRow}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text style={styles.locationText}>{weather.locationName}</Text>
          </View>
          <View style={styles.updateRow}>
            <Text style={styles.updatedText}>{updatedText}</Text>
            <TouchableOpacity onPress={() => fetchWeather(true)} style={styles.refreshIcon}>
              <RefreshCw size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainRow}>
          <View>
            <Text style={styles.tempText}>{Math.round(weather.temperature)}°C</Text>
            <Text style={styles.conditionText}>{weather.condition}</Text>
          </View>
          <View style={styles.iconContainer}>
            {weather.rainProbability >= 50 ? (
              <CloudRain size={48} color={theme.colors.info} />
            ) : weather.condition.toLowerCase().includes('cloud') ? (
              <Cloud size={48} color={theme.colors.textSecondary} />
            ) : (
              <Sun size={48} color="#F59E0B" />
            )}
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Rain chance: {weather.rainProbability}%</Text>
          {weather.rainPeriodString && (
            <Text style={styles.footerHighlight}> • Today, {weather.rainPeriodString}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Rain Alert Box */}
      {showRainAlert && (
        <View style={styles.alertBox}>
          <View style={styles.alertHeader}>
            <AlertTriangle size={20} color="#B45309" />
            <Text style={styles.alertTitle}>Rain Alert</Text>
          </View>
          <Text style={styles.alertText}>
            Heavy rain is expected in your area today. You may want to plan your stock movement and deliveries accordingly.
          </Text>
          {weather.rainPeriodString && (
            <Text style={styles.alertTime}>Expected around: {weather.rainPeriodString}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updatedText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginRight: 6,
  },
  refreshIcon: {
    padding: 2,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tempText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  conditionText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  iconContainer: {
    marginRight: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  footerHighlight: {
    fontSize: 14,
    color: theme.colors.info,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  retryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  alertBox: {
    marginTop: 12,
    backgroundColor: '#FEF3C7', // Amber-50
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A', // Amber-200
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B45309', // Amber-700
    marginLeft: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#92400E', // Amber-800
    lineHeight: 20,
  },
  alertTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 8,
  }
});
