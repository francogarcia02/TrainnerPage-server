import fetch from 'node-fetch';

export const verificarPago = async (payment_id, accessToken) => {
    try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json()

        return data;
    } catch (error) {
        console.error("Error al verificar el pago:", error);
    }
};
