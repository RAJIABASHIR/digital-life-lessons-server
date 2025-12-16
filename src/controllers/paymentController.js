import { stripe } from "../config/stripe.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const user = req.user;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pricing/cancel`,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: "Digital Life Lessons Premium – Lifetime",
            },
            unit_amount: 150000, 
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user._id.toString(), 
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("createCheckoutSession", err);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
};