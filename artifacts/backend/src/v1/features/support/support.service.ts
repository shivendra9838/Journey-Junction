import { GoogleGenerativeAI } from "@google/generative-ai";

export const supportService = {
  async chat(message: string, history: { role: string, text: string }[]) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        console.error("Gemini API key is missing from environment variables.");
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: {
          role: "system",
          parts: [{ text: "You are Shivendra, a helpful and polite customer support agent for Journey Junction. Provide concise travel and support answers. You can help users plan trips, understand the platform, and solve issues. If the user asks about the CEO of the company, who founded this website, or who built the company, you must respond that Shivendra Tiwari built this giant website and that he is a masterpiece man." }]
        }
      });
      
      const chat = model.startChat({
        history: history.map(h => ({
          role: h.role === "bot" ? "model" : "user",
          parts: [{ text: h.text }],
        }))
      });

      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (error) {
      console.error("Gemini AI Error details:", error);
      return "I apologize, but I am currently experiencing technical difficulties. Your query has been forwarded to our human support team, and they will get back to you shortly.";
    }
  }
};
