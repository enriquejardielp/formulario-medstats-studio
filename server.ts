import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint for structured clinical data extraction from free text
app.post('/api/extract-clinical-text', async (req, res) => {
  try {
    const { text, fields } = req.body;
    if (!text || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Faltan parámetros text o fields.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY no configurada en el servidor.' });
    }

    const fieldDescriptions = fields.map((f: any) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      unit: f.unit || '',
      options: f.options || [],
      description: f.description || '',
    }));

    const prompt = `Eres un asistente médico experto en extracción y normalización de datos clínicos.
Dado el siguiente texto clínico (que puede ser una analítica de laboratorio, un informe de ecocardiograma, antecedentes médicos o constantes vitales):
"""
${text}
"""

Extrae los valores correspondientes para los siguientes campos disponibles en el formulario:
${JSON.stringify(fieldDescriptions, null, 2)}

INSTRUCCIONES CLÍNICAS:
1. Para campos de tipo 'number', extrae únicamente el número como float o integer (sin unidades de texto).
2. Para campos de tipo 'boolean', devuelve true o false.
3. Para campos de tipo 'select' o 'radio', selecciona la opción exacta del array 'options' que mejor coincida con el informe.
4. Para campos de tipo 'multiselect', devuelve un array de strings con las opciones coincidentes del array 'options'.
5. Para campos de tipo 'text' o 'textarea', extrae el fragmento o resumen pertinente.
6. Si un dato no se menciona en el texto clínico, NO lo incluyas en el objeto devuelto.
7. Devuelve ÚNICAMENTE un objeto JSON válido con los nombres de variable (name) como claves y los valores extraídos.`;

    let outputText = '{}';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      outputText = response.text || '{}';
    } catch (aiErr: any) {
      console.warn('Fallo con gemini-flash-latest, intentando gemini-3.1-flash-lite:', aiErr.message);
      try {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        outputText = fallbackResp.text || '{}';
      } catch (fallbackErr: any) {
        throw new Error(fallbackErr.message || aiErr.message);
      }
    }

    const parsed = JSON.parse(outputText);
    return res.json({ extractedData: parsed });
  } catch (error: any) {
    console.error('Error en extracción clínica con Gemini:', error);
    return res.status(500).json({ error: error.message || 'Error al procesar el texto clínico.' });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CliniForm Server escuchando en http://localhost:${PORT}`);
  });
}

startServer();
