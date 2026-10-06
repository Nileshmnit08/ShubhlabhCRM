import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { MoreVertical, RefreshCw, ShoppingCart, PackageOpen, Info, MessageCircle } from 'lucide-react-native';

// Optional: Import a WhatsApp FAB if one exists globally. We'll implement a simple one here.

export default function HomeScreen() {
  const { userProfile, customerProfile, logout } = useAuth();
  const navigation = useNavigation();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [banner, setBanner] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [latestUpdate, setLatestUpdate] = useState(null);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    setLoading(true);
    setError(false);
    try {
      // In a real implementation, this would call Supabase APIs or Edge Functions.
      // E.g., fetch last order from `sales_invoices` or `orders` table
      // Currently, we simulate empty states since the backend endpoints for these specific buyer home summaries don't exist in the current sprint scope.
      
      setBanner(null); // Simulate no active banner
      setLastOrder(null); // Simulate no previous order
      setCurrentOrder(null); // Simulate no active order
      setLatestUpdate({
        title: "🎁 Is Mahine Ki Special Scheme",
        description: "Shubh Labh Dairy Special par..."
      });

    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const openMenu = () => {
    Alert.alert(
      "Menu",
      "Features coming soon",
      [
        { text: "My Profile", onPress: () => navigation.navigate("ProfileTab") },
        { text: "Logout", onPress: logout, style: "destructive" },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleWhatsApp = () => {
    // Open WhatsApp
    Alert.alert("Contact Support", "Opening WhatsApp...");
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Jankari la rahe hain...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Kuch dikkat aa gayi. Dobara koshish karein.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchHomeData}>
          <Text style={styles.retryButtonText}>DOBARA KOSHISH KAREIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const buyerName = userProfile?.display_name || customerProfile?.name || "Namaste";
  const shopName = customerProfile?.shop_name || "";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>Shubh Labh</Text>
        <TouchableOpacity onPress={openMenu} style={styles.menuIcon}>
          <MoreVertical size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Identity */}
        <View style={styles.identitySection}>
          <Text style={styles.greetingText}>Namaste, {buyerName}</Text>
          {!!shopName && <Text style={styles.shopText}>{shopName}</Text>}
        </View>

        {/* Banner */}
        {banner ? (
          <View style={styles.bannerSection}>
            <Image source={{ uri: banner.image_url }} style={styles.bannerImage} />
          </View>
        ) : null}

        {/* Repeat Order */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pichhla Order Dobara Lagao</Text>
          {lastOrder ? (
            <View>
              <Text style={styles.detailText}>{lastOrder.product_name}</Text>
              <Text style={styles.detailText}>{lastOrder.quantity} Bags - ₹{lastOrder.amount}</Text>
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>DOBARA ORDER KAREIN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.emptyText}>Abhi Koi Pichhla Order Nahi Hai</Text>
              {/* No button needed here as primary CTA is right below */}
            </View>
          )}
        </View>

        {/* NAYA ORDER LAGAO - PRIMARY CTA */}
        <TouchableOpacity 
          style={styles.primaryCTA} 
          onPress={() => navigation.navigate("ProductsTab")}
        >
          <ShoppingCart color="#FFFFFF" size={28} style={{ marginRight: 12 }} />
          <Text style={styles.primaryCTAText}>NAYA ORDER LAGAO</Text>
        </TouchableOpacity>

        {/* Current Order */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mera Order</Text>
          {currentOrder ? (
            <View>
              <Text style={styles.detailText}>Order #{currentOrder.reference}</Text>
              <Text style={styles.detailText}>{currentOrder.status}</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("OrdersTab")}>
                <Text style={styles.secondaryButtonText}>ORDER DEKHEIN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.emptyText}>Abhi Koi Order Chalu Nahi Hai</Text>
            </View>
          )}
        </View>

        {/* Aaj Ki Khabar */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Aaj Ki Khabar</Text>
          {latestUpdate ? (
            <View style={styles.newsRow}>
              <View style={styles.newsContent}>
                <Text style={styles.newsHeading}>{latestUpdate.title}</Text>
                <Text style={styles.newsSub}>{latestUpdate.description}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Nayi khabar nahi hai.</Text>
          )}
        </View>
        
        {/* Bottom padding for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* WhatsApp FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleWhatsApp}>
        <MessageCircle color="#FFFFFF" size={28} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#4B5563' },
  errorText: { fontSize: 18, color: '#DC2626', marginBottom: 16, textAlign: 'center' },
  retryButton: { backgroundColor: '#F97316', padding: 16, borderRadius: 12 },
  retryButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  brandTitle: { fontSize: 24, fontWeight: 'bold', color: '#F97316' },
  menuIcon: { padding: 8 },
  
  scrollContent: { padding: 16 },
  
  identitySection: { marginBottom: 24 },
  greetingText: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  shopText: { fontSize: 18, color: '#6B7280', marginTop: 4 },
  
  bannerSection: { marginBottom: 24, borderRadius: 12, overflow: 'hidden' },
  bannerImage: { width: '100%', height: 160, resizeMode: 'cover' },
  
  sectionCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  detailText: { fontSize: 16, color: '#4B5563', marginBottom: 4 },
  emptyText: { fontSize: 16, color: '#6B7280', fontStyle: 'italic' },
  
  secondaryButton: { backgroundColor: '#F3F4F6', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  secondaryButtonText: { color: '#4B5563', fontSize: 16, fontWeight: 'bold' },
  
  primaryCTA: { backgroundColor: '#F97316', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  primaryCTAText: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  
  newsRow: { flexDirection: 'row', alignItems: 'center' },
  newsContent: { flex: 1 },
  newsHeading: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  newsSub: { fontSize: 15, color: '#4B5563' },
  
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#10B981', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }
});
