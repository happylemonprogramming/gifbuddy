// Initialize payment form when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {

        // Fetch publishable key from server
        const { publishableKey } = await fetch("/config").then(r => r.json());
        const stripe = Stripe(publishableKey);

        // Create payment intent and get client secret
        const { clientSecret } = await fetch("/create-payment-intent", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            // You might want to add body data here depending on your needs
            // body: JSON.stringify({ amount: 1000, currency: 'usd' })
        }).then(r => r.json());

        // const container = document.getElementById('stripe-button-container');
        // const buyButton = document.createElement('stripe-buy-button');
        // buyButton.setAttribute('buy-button-id', 'buy_btn_1QM00uGjpNqUmv6RY2yQvOHz');
        // buyButton.setAttribute('publishable-key', 'pk_live_51PF9bxGjpNqUmv6Ra8aL6oKO9I8odnc6PUjf7gGIsd4DuFKAOxkdx8dKnsszXo7ZdbRLsiJFaqlRrRz6nnM4hB9G00GVEoO9P5');
        // container.appendChild(buyButton);

        // // Initialize Stripe Elements
        // const elements = stripe.elements({ clientSecret });
        
        // // Create payment element
        // const paymentElement = elements.create('payment');
        // paymentElement.mount('#payment-element');
    

        // const appearance = {
        //     theme: 'stripe',
        //     variables: {
        //         borderRadius: '36px',
        //     }
        // };

        // const expressCheckoutOptions = {
        //     buttonHeight: 50,
        //     buttonTheme: {
        //         applePay: 'white-outline'
        //     },
        //     buttonType: {
        //         applePay: 'buy',
        //         googlePay: 'buy',
        //         paypal: 'buynow'
        //     }
        // };

        // const elements = stripe.elements({
        //     mode: 'payment',
        //     amount: 50,
        //     currency: 'usd',
        //     appearance,
        // });

        // const expressCheckoutElement = elements.create('expressCheckout', expressCheckoutOptions);
        // expressCheckoutElement.mount('#express-checkout-element');

        const appearance = {
            theme: 'stripe',
            variables: {
                borderRadius: '36px',
            }
        };
        
        const expressCheckoutOptions = {
            buttonHeight: 50,
            buttonTheme: {
                applePay: 'white-outline',
                googlePay: 'white'
            },
        };
        
        const elements = stripe.elements({'clientSecret': clientSecret, 'appearance': appearance });
        
        const expressCheckoutElement = elements.create('expressCheckout', expressCheckoutOptions);
        expressCheckoutElement.mount('#express-checkout-element');

        expressCheckoutElement.addEventListener('submit', async (e) => {
        // form.addEventListener('submit', async (e) => {
            e.preventDefault();
        
            // Proceed with content creation
            const prompt = document.getElementById('promptInput').value;
            const caption = document.getElementById('captionInput').value;
            
            const createResponse = await fetch('/creating', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    caption: caption
                })
            });

            if (!createResponse.ok) {
                throw new Error('Failed to create content');
            }

            const responseData = await createResponse.json();
            
            if (!responseData.id) {
                throw new Error('No task ID received from server');
            }
            
            // Convert the task ID to string to ensure proper URL encoding
            const taskId = String(responseData.id);
        
            // Construct the return URL with the taskId parameter
            const baseUrl = window.location.href.split("?")[0];
            const url = new URL(baseUrl);
            const cleanBaseUrl = url.origin;
            
            if (taskId) {
                const params = new URLSearchParams();
                params.append('taskId', taskId);
                params.append('prompt', prompt);
                params.append('caption', caption);
                const returnUrl = `${cleanBaseUrl}/creation?${params.toString()}`;
            } else {
                alert('Something Broke: Unable to Find Task ID!')
            }

            try {
                const { error } = await stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        return_url: returnUrl
                    }
                });
        
                if(error) {
                    const messages = document.getElementById("error-messages")
                    messages.innerText = error.message;
                }
            } catch (err) {
                console.error('Unexpected error during payment:', err);
                const messages = document.getElementById("error-messages");
                messages.innerText = 'An unexpected error occurred. Please try again later.';
            }
        });
    });