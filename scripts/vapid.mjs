// npm run vapid  -> prints a key pair to paste into .env
import webpush from 'web-push';
const k = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY="${k.publicKey}"\nVAPID_PRIVATE_KEY="${k.privateKey}"`);
