import { Game, Seller, WarrantyCalculation } from '../types/vault';

export function calculateWarranty(purchaseDateStr: string, warrantyMonths: number): WarrantyCalculation {
  const purchase = new Date(purchaseDateStr);
  const expiry = new Date(purchase);
  expiry.setMonth(expiry.getMonth() + warrantyMonths);

  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isWarrantyActive = diffDays > 0;
  const daysRemaining = Math.max(0, diffDays);

  return {
    isWarrantyActive,
    isExpiringSoon: isWarrantyActive && daysRemaining <= 14,
    daysRemaining,
    expiryDate: expiry.toISOString().split('T')[0],
  };
}

export function generateWarrantyClaimMessage(game: Game, seller?: Seller): string {
  const warranty = calculateWarranty(game.purchase_date, game.warranty_months);
  const warrantyStatusStr = warranty.isWarrantyActive
    ? `✅ ACTIVE (${warranty.daysRemaining} days remaining, expires ${warranty.expiryDate})`
    : `❌ EXPIRED on ${warranty.expiryDate}`;

  return [
    `🚨 *CONSOLE VAULT — PS5 LICENSE REVOKED CLAIM* 🚨`,
    ``,
    `Hello ${seller?.name || 'Seller'},`,
    `My digital PS5 game access has been revoked / locked (padlock icon).`,
    ``,
    `📋 *Order Information:*`,
    `• *Game Title*: ${game.title}`,
    `• *Account Type*: ${game.account_type}`,
    `• *Purchase Date*: ${game.purchase_date}`,
    `• *Warranty Status*: ${warrantyStatusStr}`,
    `• *PSN Account*: ${game.psn_email}`,
    ``,
    `Please provide a replacement account or restore access under warranty. Thank you!`,
  ].join('\n');
}

export function generateSellerDeepLink(game: Game, seller?: Seller): string | null {
  if (!seller || !seller.contact_link) return null;

  const message = generateWarrantyClaimMessage(game, seller);
  const encodedMsg = encodeURIComponent(message);
  const cleanContact = seller.contact_link.trim();

  if (seller.contact_platform === 'WhatsApp') {
    // Strip non-numeric characters for phone number
    const phone = cleanContact.replace(/[^0-9]/g, '');
    return `https://wa.me/${phone}?text=${encodedMsg}`;
  } else if (seller.contact_platform === 'Telegram') {
    const handle = cleanContact.replace(/^@/, '');
    return `https://t.me/${handle}?text=${encodedMsg}`;
  }

  return cleanContact;
}
