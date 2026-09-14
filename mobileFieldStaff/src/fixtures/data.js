export const customers = [
  { id: '1', name: 'Gupta Traders', location: 'Chandni Chowk', statusType: 'pending', dues: '₹4,500', distance: '1.2 km' },
  { id: '2', name: 'Sharma Electronics', location: 'Lajpat Nagar', statusType: 'overdue', dues: '₹12,000', distance: '3.4 km' },
  { id: '3', name: 'Verma Provisions', location: 'Karol Bagh', statusType: 'completed', dues: '₹0', distance: '5.1 km' },
];

export const workItems = [
  { id: '1', title: 'Payment Collection', customerName: 'Gupta Traders', time: '10:00 AM', statusType: 'pending' },
  { id: '2', title: 'Inventory Check', customerName: 'Sharma Electronics', time: '11:30 AM', statusType: 'inProgress' },
  { id: '3', title: 'Follow Up', customerName: 'Verma Provisions', time: '2:00 PM', statusType: 'completed' },
];

export const customerProfile = {
  id: '1',
  name: 'Gupta Traders',
  location: 'Chandni Chowk, Delhi',
  statusType: 'pending',
  dues: '₹4,500',
  creditLimit: '₹50,000',
  lastOrder: '₹12,400 (3 days ago)',
  phone: '+91 98765 43210'
};
