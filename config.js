import dotenv from 'dotenv';

dotenv.config(); // Carga las variables de entorno desde .env

export const config = {
    client_id: process.env.ID,
    client_secret: process.env.SECRET,
    refresh_token: process.env.REFRESH_TOKEN,
    mp_access: process.env.MP_ACCESS
};
