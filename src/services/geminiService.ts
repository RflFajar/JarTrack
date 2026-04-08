import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getHealthRecommendations(weight: number, height: number, age: number) {
  const prompt = `
    As a health and fitness assistant, provide personalized exercise and nutrition recommendations for a user with the following profile:
    - Weight: ${weight} kg
    - Height: ${height} cm
    - Age: ${age} years old

    Please provide:
    1. A brief summary of their health status (BMI category).
    2. 3 specific exercise recommendations.
    3. 3 specific nutrition/dietary recommendations.

    Keep the tone encouraging and professional. Format the response in clear sections with bullet points.
    Use Indonesian language (Bahasa Indonesia).
  `;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating health recommendations:", error);
    return "Maaf, saya tidak dapat memberikan rekomendasi saat ini. Silakan coba lagi nanti.";
  }
}

export async function getFinanceAdvice(transactions: any[]) {
  const prompt = `
    As a financial advisor, analyze these transactions for an Indonesian student.
    Transactions: ${JSON.stringify(transactions)}
    
    Provide a brief, helpful advice in Indonesian (Bahasa Indonesia) on how to save money or avoid overspending based on the patterns.
    Keep it concise and practical for a student budget.
    Do not include any markdown blocks, just the text.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating finance advice:", error);
    return "Gagal mendapatkan saran keuangan saat ini.";
  }
}
export async function getWeeklyPlan(
  type: 'study' | 'exercise' | 'nutrition', 
  weight?: number, 
  height?: number, 
  age?: number,
  transactions?: any[]
) {
  const prompt = `
    As a personal coach, generate a detailed 7-day weekly plan for ${type.toUpperCase()}.
    ${weight && height && age ? `User Profile: Weight ${weight}kg, Height ${height}cm, Age ${age} years.` : ''}
    
    ${type === 'exercise' ? `
    For EXERCISE: Provide a list of specific exercises for EACH day. 
    Each day should have 3-5 specific exercise tasks.
    Example: {"day": "Monday", "title": "Push-ups", "description": "3 sets of 15 reps"}, {"day": "Monday", "title": "Squats", "description": "3 sets of 20 reps"}
    ` : ''}
    
    ${type === 'nutrition' ? `
    For NUTRITION: Provide a meal schedule for EACH day with specific times.
    Each day should have at least 4 meal tasks (Breakfast, Lunch, Snack, Dinner).
    
    ${transactions && transactions.length > 0 ? `
    USER FINANCE DATA:
    The user has the following recent transactions: ${JSON.stringify(transactions.slice(0, 15))}.
    Please adjust the meal recommendations based on their spending habits.
    If they are spending a lot on food, suggest cheaper alternatives.
    If they have a very tight budget, prioritize extremely low-cost but nutritious Indonesian meals (like tempe, tahu, telur).
    ` : ''}

    IMPORTANT CONSTRAINTS for Nutrition:
    1. Menu must be BUDGET-FRIENDLY for an INDONESIAN UNIVERSITY STUDENT (Mahasiswa).
    2. Use ingredients easily found in Indonesia (e.g., tempe, tahu, telur, sayur bayam, kangkung, nasi putih/merah, buah lokal).
    3. Avoid expensive ingredients like salmon, avocado, or imported berries.
    4. Tasks for each day MUST be generated in CHRONOLOGICAL ORDER (e.g., 07:00, 10:00, 13:00, 19:00).
    
    Example: {"day": "Monday", "title": "07:00 - Sarapan", "description": "Telur dadar dengan nasi putih and irisan timun"}, {"day": "Monday", "title": "13:00 - Makan Siang", "description": "Sayur bening bayam, tempe goreng, dan nasi putih"}
    ` : ''}

    Provide a JSON array of tasks. Each task must have:
    - day: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", or "Sunday"
    - title: A short title for the task (for nutrition, include the time like "08:00 - Sarapan")
    - description: Detailed instructions or details
    
    Format the output as a valid JSON array. Do not include any other text, markdown blocks, or explanations.
    Use Indonesian language (Bahasa Indonesia).
    
    Example format:
    [
      {"day": "Monday", "title": "...", "description": "..."},
      ...
    ]
  `;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text.trim();
    const cleanJson = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error(`Error generating weekly ${type} plan:`, error);
    throw error;
  }
}
