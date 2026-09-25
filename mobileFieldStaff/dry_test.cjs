
let lastUrl = '';
let lastAlert = null;
const Linking = {
  canOpenURL: async (url) => true,
  openURL: async (url) => { lastUrl = url; }
};
const Alert = {
  alert: (title, msg) => { lastAlert = {title, msg}; console.log('ALERT:', title, msg); }
};
const supabase = {
  from: () => ({
    select: () => ({
      eq: (col, val) => ({
        single: async () => {
          if (val === 'VALID_ID') return { data: { mobile: '9876543210', display_name: 'Test Customer' } };
          if (val === 'INVALID_PHONE_ID') return { data: { mobile: '123' } }; // will be 123
          if (val === 'MISSING_PHONE_ID') return { data: {} };
          return { error: new Error('Not found') };
        }
      })
    })
  })
};

const formatDateFull = (date) => new Date(date).toISOString().substring(0, 10);


const WhatsAppService = {
  /**
   * Share an order on WhatsApp
   * @param {Object} orderData - The order/requirement record
   * @param {Array} requirementItems - The requirement items array
   * @param {Object} fallbackParty - Optional party info if orderData doesn't have it populated
   */
  shareOrder: async (orderData, requirementItems, fallbackParty) => {
    try {
      // 1. Resolve Customer Phone
      const partyId = orderData?.party_id || fallbackParty?.id;
      if (!partyId) {
        Alert.alert('Error', 'No customer reference found for this order.');
        return;
      }

      // Always fetch authoritative customer record
      const { data: partyData, error } = await supabase
        .from('crm_parties')
        .select('mobile, display_name')
        .eq('id', partyId)
        .single();
        
      if (error || !partyData || !partyData.mobile) {
        Alert.alert('No Mobile Number', 'Customer does not have a registered mobile number for WhatsApp.');
        return;
      }

      // 2. Normalize Phone Number
      let phone = partyData.mobile.replace(/\D/g, '');
      // If 10 digits, assume India (+91)
      if (phone.length === 10) {
        phone = '91' + phone;
      }

      // 3. Format Message
      const customerName = partyData.display_name || 'Customer';
      const orderRef = orderData.id.slice(0, 8).toUpperCase();
      const orderDate = orderData.created_at ? formatDateFull(orderData.created_at) : 'Unknown';

      let message = `*Shubh Labh Order Confirmation*\n\n`;
      message += `*Customer:* ${customerName}\n`;
      message += `*Order Number:* ${orderRef}\n`;
      message += `*Date:* ${orderDate}\n\n`;
      message += `*Products:*\n`;

      let totalWeightKg = 0;
      let canCalculateWeight = false;

      // Make sure we have items
      const items = requirementItems || orderData.requirement_items || [];
      
      items.forEach(item => {
        message += `\n*${item.category || 'Product'}*\n`;
        message += `${item.product_name}\n`;
        
        let itemWeight = 0;
        if (item.weight) {
           itemWeight = item.weight;
        } else if (item.product_name) {
           const match = item.product_name.match(/\((\d+(?:\.\d+)?)\s*kg\)/i);
           if (match && match[1]) {
             itemWeight = parseFloat(match[1]);
           }
        }
        
        if (item.unit === 'Bags' && itemWeight > 0 && item.quantity) {
          canCalculateWeight = true;
          totalWeightKg += item.quantity * itemWeight;
          message += `${itemWeight} kg × ${item.quantity} Bags\n`;
          message += `Total: ${(itemWeight * item.quantity).toLocaleString()} kg\n`;
        } else {
          message += `${item.quantity} ${item.unit}\n`;
        }
      });

      if (canCalculateWeight && totalWeightKg > 0) {
        message += `\n*TOTAL ORDER WEIGHT*\n${totalWeightKg.toLocaleString()} kg\n`;
      }

      // 4. Create WhatsApp URL
      const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

      // 5. Open WhatsApp (No automatic send)
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp Not Installed', 'WhatsApp does not appear to be installed on this device.');
      }

    } catch (err) {
      console.warn('WhatsApp Share Error:', err);
      Alert.alert('Error', 'An unexpected error occurred while preparing WhatsApp share.');
    }
  }
};


async function runTests() {
  console.log('--- TEST A: Direct Order ---');
  lastUrl = ''; lastAlert = null;
  await WhatsAppService.shareOrder(
    { id: 'ORD123456789', party_id: 'VALID_ID', created_at: new Date().toISOString() },
    [{ category: 'Mix', product_name: 'Dry Mix (50 kg)', quantity: 20, unit: 'Bags' }]
  );
  console.log('Test A URL:', decodeURIComponent(lastUrl));

  console.log('\n--- TEST B: Multi-product Order ---');
  lastUrl = ''; lastAlert = null;
  await WhatsAppService.shareOrder(
    { id: 'ORD999', party_id: 'VALID_ID', created_at: new Date().toISOString() },
    [
      { category: 'Mix', product_name: 'Dry Mix (50 kg)', quantity: 20, unit: 'Bags' },
      { category: 'Oil', product_name: 'Mustard Oil (15 kg)', quantity: 10, unit: 'Bags', weight: 15 } // testing direct weight vs parsed
    ]
  );
  console.log('Test B URL:', decodeURIComponent(lastUrl));

  console.log('\n--- TEST C: Missing phone ---');
  lastUrl = ''; lastAlert = null;
  await WhatsAppService.shareOrder(
    { id: 'ORD123456789', party_id: 'MISSING_PHONE_ID', created_at: new Date().toISOString() },
    []
  );

  console.log('\n--- TEST D: Invalid phone (short) ---');
  lastUrl = ''; lastAlert = null;
  await WhatsAppService.shareOrder(
    { id: 'ORD123456789', party_id: 'INVALID_PHONE_ID', created_at: new Date().toISOString() },
    []
  );
  console.log('Test D URL:', decodeURIComponent(lastUrl));
}
runTests();
