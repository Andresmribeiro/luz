import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function diagnosePlant(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          parts: [
            { text: "Você é um agrônomo especialista. Analise esta imagem de uma planta e identifique possíveis doenças, deficiências nutricionais ou pragas. Forneça o diagnóstico, a causa provável e recomendações de tratamento em português. Responda em formato JSON com as chaves: 'diagnostico', 'causa', 'recomendacoes', 'gravidade' (baixa, media, alta)." },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(",")[1] || base64Image,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro no diagnóstico por IA:", error);
    throw error;
  }
}
