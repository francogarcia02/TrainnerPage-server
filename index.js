import express from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { MiddleWare } from './middlewares/middleware.js';
import { config } from './config.js';
import { verificarPago } from './utils/verifyPay.js';
import formData from 'form-data';
import Mailgun from 'mailgun.js';

import { MercadoPagoConfig, Preference } from 'mercadopago';
// Agrega credenciales
const client = new MercadoPagoConfig({ accessToken: config.mp_access });


// Inicializa el servidor de Express
const app = express();
app.use(express.json());
const port = 4000;
app.use(MiddleWare())

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración del cliente OAuth2
const client_id = config.client_id
const client_secret = config.client_secret
const refresh_token = config.refresh_token

// Configuración de OAuth2
const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000/');
oauth2Client.setCredentials({ refresh_token });

const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY });

// Función para generar PDF (igual que antes)
const generatePDF = (filePath, textLines) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);
    doc.font('Helvetica');
    doc.fontSize(20).text('Información:', { align: 'center' });
    doc.moveDown();

    textLines.forEach((line, index) => {
      if (index % 2 === 0) doc.fillColor('black').font('Helvetica');
      else doc.fillColor('red').font('Helvetica-Bold');

      doc.fontSize(14).text(line);
      doc.moveDown(0.5);
    });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

// Función para crear un transporter de Nodemailer
const createTransporter = async () => {
  const { token } = await oauth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: 'manualbarracin.trainner@gmail.com',
      clientId: client_id,
      clientSecret: client_secret,
      refreshToken: refresh_token,
      accessToken: token,
    },
  });
};

app.use(express.urlencoded({ extended: true })); // Para recibir el texto de FormData

const upload = multer({ storage: multer.memoryStorage() }); // Manejo de imágenes en memoria

app.post('/send-email', upload.array('images', 5), async (req, res) => {
  try {
    const subject = req.body.subject;
    const text = req.body.text;
    const pdfPath = path.join(__dirname, 'archivo.pdf');

    await generatePDF(pdfPath, text);

    const attachments = req.files.map(file => ({
      filename: file.originalname,
      data: file.buffer
    }));

    attachments.push({
      filename: 'archivo.pdf',
      data: fs.readFileSync(pdfPath)
    });

    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: process.env.MAILGUN_FROM_EMAIL,
      to: ["Manuel <manualbarracin.trainner@gmail.com>"],
      subject,
      text: 'Adjunto encontrarás los archivos.',
      attachment: attachments
    });

    await fs.promises.unlink(pdfPath);
    console.log('🗑️ Archivo PDF eliminado correctamente');

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error en /send-email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/send-payment-confirmation', async (req, res) => {
  try {
    const subject = req.body.subject;
    const text = req.body.text;

    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: process.env.MAILGUN_FROM_EMAIL,
      to: ["Manuel <manualbarracin.trainner@gmail.com>"],
      subject,
      text
    });

    res.status(200).send(true);
  } catch (error) {
    console.error('❌ Error al enviar el correo de confirmación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/create-preference', async (req, res) => {
  const { price, title } = req.body;
  const preference = new Preference(client);

  preference.create({
    body: {
      items: [
        {
          title: title,
          quantity: 1,
          unit_price: price
        }
      ],
      back_urls: {
        success: `https://trainner-page-client.vercel.app/success`,  // URL a la que el usuario será redirigido si el pago fue exitoso
        failure: 'https://trainner-page-client.vercel.app/failure',  // URL si el pago falla
        pending: 'https://trainner-page-client.vercel.app/pending'   // URL si el pago queda pendiente
      },
      auto_return: 'approved' // Redirigir automáticamente si el pago es aprobado
    }
  })
  .then(data => res.send(data))
  .catch(error => {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la preferencia' });
  });
});

app.post('/verify-payment', async (req, res) => {
  const {payment_id} = req.body
  const data = verificarPago(payment_id, config.mp_access)
  res.send(data)
})


// Inicia el servidor de Express
app.listen(port, () => {
  console.log('Servidor escuchando en el puerto: ',port);
});
