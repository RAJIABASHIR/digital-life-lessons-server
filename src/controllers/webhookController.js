import { stripe } from "../config/stripe.js";
import { getDB } from "../config/db.js";

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const uid = session.metadata?.uid; 

      if (uid) {
        const db = getDB();
        const usersCol = db.collection("users");

        await usersCol.updateOne(
          { uid },
          { $set: { isPremium: true, updatedAt: new Date() } }
        );

        console.log("User upgraded to premium (uid):", uid);
      }
    }

    

    res.json({ received: true });
  } catch (err) {
    console.error("handleStripeWebhook error", err);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};