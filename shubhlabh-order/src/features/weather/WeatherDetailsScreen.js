import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, CloudRain, Droplets, MapPin, Thermometer } from 'lucide-react-native';
import { theme } from '../../shared/theme';

export default function WeatherDetailsScreen({ route, navigation }) {
  const { weather } = route.params;

  if (!weather) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Weather data unavailable.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weather Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Info */}
        <View style={styles.heroCard}>
          <View style={styles.locationRow}>
            <MapPin size={20} color={theme.colors.primary} />
            <Text style={styles.locationText}>{weather.locationName}</Text>
          </View>
          
          <Text style={styles.tempText}>{Math.round(weather.temperature)}°C</Text>
          <Text style={styles.conditionText}>{weather.condition}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Droplets size={24} color={theme.colors.info} />
              <Text style={styles.statValue}>{weather.rainProbability}%</Text>
              <Text style={styles.statLabel}>Rain Chance</Text>
            </View>
            <View style={styles.statBox}>
              <Thermometer size={24} color={theme.colors.warning} />
              <Text style={styles.statValue}>{Math.round(weather.temperature)}°C</Text>
              <Text style={styles.statLabel}>Current</Text>
            </View>
          </View>
          
          {weather.rainPeriodString && (
            <View style={styles.rainPeriodBox}>
              <CloudRain size={20} color={theme.colors.white} />
              <Text style={styles.rainPeriodText}>
                Rain expected: {weather.rainPeriodString}
              </Text>
            </View>
          )}
        </View>

        {/* Hourly Forecast */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOURLY FORECAST</Text>
          <View style={styles.hourlyContainer}>
            {weather.forecast && weather.forecast.map((hr, idx) => (
              <View key={idx} style={styles.hourlyRow}>
                <Text style={styles.hourlyTime}>{hr.formattedTime}</Text>
                
                <View style={styles.hourlyCenter}>
                  {hr.precipProb >= 30 ? (
                    <CloudRain size={20} color={theme.colors.info} />
                  ) : (
                    <Text style={styles.hourlyTemp}>{Math.round(hr.temp)}°C</Text>
                  )}
                </View>

                <View style={styles.hourlyRight}>
                  <Text style={[
                    styles.hourlyProb,
                    hr.precipProb >= 50 && styles.hourlyProbHigh
                  ]}>
                    {hr.precipProb}%
                  </Text>
                </View>
              </View>
            ))}
            
            {(!weather.forecast || weather.forecast.length === 0) && (
              <Text style={styles.noDataText}>No forecast data available for today.</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  tempText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    lineHeight: 72,
  },
  conditionText: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  rainPeriodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.info,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.button,
    width: '100%',
    justifyContent: 'center',
    marginTop: 8,
  },
  rainPeriodText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  hourlyContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  hourlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  hourlyTime: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  hourlyCenter: {
    flex: 1,
    alignItems: 'center',
  },
  hourlyTemp: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  hourlyRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  hourlyProb: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  hourlyProbHigh: {
    color: theme.colors.info,
  },
  noDataText: {
    padding: 20,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: theme.colors.textSecondary,
  }
});
