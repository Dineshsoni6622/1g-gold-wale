// File path in GitHub: api/order.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const order = req.body;
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      return res.status(400).json({ error: "Invalid order items" });
    }

    // 1. Server-Side Price & Coupon Recalculation (Prevents DevTools tampering)
    const calculatedSubTotal = order.items.reduce((sum, item) => {
      const price = Math.max(1, Number(item.price) || 0);
      const qty = Math.max(1, parseInt(item.qty, 10) || 1);
      return sum + price * qty;
    }, 0);

    let verifiedDiscount = 0;
    if (order.couponCode === "GOLD100" && calculatedSubTotal >= 499) {
      verifiedDiscount = 100;
    }
    const prepaidDiscount = order.paymentMode === "Prepaid" ? 50 : 0;
    const verifiedTotal = Math.max(0, calculatedSubTotal - verifiedDiscount - prepaidDiscount);

    // 2. Hidden Telegram Bot Token (Set TELEGRAM_BOT_TOKEN in Vercel Environment Variables)
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7661365844:AAEzX3hMJnQZArO7D5KutC8-3B-jXCpeNgY";
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "6034624815";

    let tgText = `🚨 *नया वेरीफाइड ऑर्डर - 1G Gold Wala*\n\n`;
    tgText += `🆔 *Order ID:* #${order.orderId}\n`;
    tgText += `📅 *Time:* ${order.date}\n`;
    tgText += `👤 *ग्राहक:* ${order.customer}\n`;
    tgText += `📞 *मोबाइल:* ${order.phone}\n`;
    tgText += `📍 *पता:* ${order.address}, ${order.cityState} - ${order.pincode}\n`;
    tgText += `💳 *पेमेंट:* ${order.paymentMode === "Prepaid" ? "Prepaid (UTR: " + order.utr + ")" : "Cash on Delivery (COD)"}\n\n`;
    tgText += `💍 *आइटम:*\n`;
    order.items.forEach((it, idx) => {
      tgText += `${idx + 1}. ${it.name} (${it.qty} × ₹${it.price}) = ₹${it.qty * it.price}\n`;
    });
    if (verifiedDiscount > 0) tgText += `\n🎁 *कूपन (GOLD100):* -₹${verifiedDiscount}`;
    if (prepaidDiscount > 0) tgText += `\n⚡ *प्रीपेड छूट:* -₹${prepaidDiscount}`;
    tgText += `\n💰 *सर्वर वेरीफाइड कुल राशि: ₹${verifiedTotal}*`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: tgText,
        parse_mode: "Markdown"
      })
    });

    return res.status(200).json({
      success: true,
      verifiedTotal: verifiedTotal,
      verifiedDiscount: verifiedDiscount + prepaidDiscount
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
