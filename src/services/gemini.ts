import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function diagnosePlant(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          parts: [
            { text: "Você é um consultor agrícola que utiliza pesquisa em tempo real na internet. Analise esta imagem de uma planta e, se necessário, pesquise na internet por pragas ou doenças similares que estejam ocorrendo atualmente na região ou época do ano. Forneça o diagnóstico baseado em dados atualizados, a causa provável e recomendações de tratamento em português. Responda em formato JSON com as chaves: 'diagnostico', 'causa', 'recomendacoes', 'gravidade' (baixa, media, alta)." },
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
        tools: [{ googleSearch: {} }],
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro no diagnóstico por IA:", error);
    throw error;
  }
}
