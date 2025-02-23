import cors from 'cors';

const ACCEPTED_ORIGINS = [
    'http://localhost:4000',
    'http://localhost:3000',
    'http://localhost:8080',
    'https://trainner-page-client.vercel.app/',
    'https://trainner-page-client-francogarcia02-admins-projects.vercel.app/',
    'https://trainner-page-client-git-main-francogarcia02-admins-projects.vercel.app/',
    /\.vercel\.app$/,
];

export const MiddleWare = ({accepted_origins = ACCEPTED_ORIGINS} = {}) => {
    console.log(accepted_origins)

    return cors({
        origin: (origin, callback) => {
            if (accepted_origins.includes(origin)) {
                return callback(null, true);
            }

            if (!origin) {
                return callback(null, true);
            }

            return callback(new Error(`Origen no permitido: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
    });
};