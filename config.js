// Site-wide contact settings. Replace these values when the final details are ready.
window.SITE = {
  name: 'Interagood',
  email: 'support@interagood.in',
  // Phone number is stored base64-encoded (not printed in the HTML); decoded only when someone taps "Call us".
  phoneEncoded: 'KzkxOTc5NDEzNDUzNA==',
  // Business location shown on the site. Leave empty to hide it.
  company: 'Wellthings',
  packageName: 'com.wellthings.interagood',
  address: 'Lucknow',
  // Backend API (Railway). Used by the Partner Program signup.
  apiBase: 'https://interagood-production.up.railway.app/api',
  // Social profile URLs. Leave a value empty to show the name without a link.
  social: {
    instagram: '',
    facebook: '',
    youtube: '',
    linkedin: '',
  },
  // Android app link (Google Play or APK download). While empty, the site shows "Launching soon".
  appUrl: 'download.html',
  hours: 'Monday to Saturday, 9:00 AM - 6:00 PM (IST)',
  responseTime: 'within 24 to 48 hours',
  // PayU Payment Gateway Modular Configuration
  payuMerchantKey: 'PLACEHOLDER_KEY',
  payuMerchantSalt: 'PLACEHOLDER_SALT',
  payuMode: 'test',
};
