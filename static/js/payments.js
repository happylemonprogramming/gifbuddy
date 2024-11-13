// Replace 'your_publishable_key' with your actual Stripe publishable key
const stripe = Stripe('pk_test_51PF9bxGjpNqUmv6RgdRDez9nxeU8GNKiHTaMziBNDsHVClGj9wWZHtR3rRDNNenXBggWr3cmr7nnAjPlr974Utb2005zmUeBbH');

const appearance = {
    theme: 'stripe',
    variables: {
        borderRadius: '36px',
    }
};

const expressCheckoutOptions = {
    buttonHeight: 50,
    buttonTheme: {
        applePay: 'white-outline'
    },
    buttonType: {
        applePay: 'buy'
    }
};

const elements = stripe.elements({
    mode: 'payment',
    amount: 50,
    currency: 'usd',
    appearance,
});

const expressCheckoutElement = elements.create('expressCheckout', expressCheckoutOptions);
expressCheckoutElement.mount('#express-checkout-element');