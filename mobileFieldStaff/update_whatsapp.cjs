const fs = require('fs');

// 1. Update OrderDetailScreen.js
let orderDetail = fs.readFileSync('src/screens/OrderDetailScreen.js', 'utf8');
orderDetail = orderDetail.replace(
  /const handleWhatsAppShare = async \(\) => \{[\s\S]*?(?=return \(\n\s*<SafeAreaView)/,
  `const handleWhatsAppShare = async () => {
    const { WhatsAppService } = require('../services/WhatsAppService');
    await WhatsAppService.shareOrder(orderData, items, orderData?.crm_parties);
  };

  `
);
fs.writeFileSync('src/screens/OrderDetailScreen.js', orderDetail);

// 2. Update OrderConfirmationScreen.js
let orderConfirm = fs.readFileSync('src/screens/OrderConfirmationScreen.js', 'utf8');
orderConfirm = orderConfirm.replace(
  /const handleWhatsAppShare = async \(\) => \{[\s\S]*?(?=return \(\n\s*<SafeAreaView)/,
  `const handleWhatsAppShare = async () => {
    const { WhatsAppService } = require('../services/WhatsAppService');
    await WhatsAppService.shareOrder(order, order.requirement_items, { id: order.party_id });
  };

  `
);
fs.writeFileSync('src/screens/OrderConfirmationScreen.js', orderConfirm);

console.log('WhatsApp logic replaced in screens.');
