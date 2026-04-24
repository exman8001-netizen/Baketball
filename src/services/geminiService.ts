import { GoogleGenerativeAI } from "@google/generative-ai";
import { BallConfig, DEFAULT_BALL_CONFIG } from "../types";

let currentApiKey = process.env.GEMINI_API_KEY || "";
let isAiEnabled = true;

export const setAiConfig = (apiKey: string, enabled: boolean) => {
  currentApiKey = apiKey;
  isAiEnabled = enabled;
};

export const getAiConfig = () => ({
  apiKey: currentApiKey,
  enabled: isAiEnabled
});

export async function checkAiConnectivity(): Promise<boolean> {
  if (!currentApiKey || !isAiEnabled) return false;
  try {
    const genAI = new GoogleGenerativeAI(currentApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    // Minimal probe
    const result = await model.generateContent("ping");
    return !!result.response;
  } catch (e) {
    console.warn("AI Connectivity check failed", e);
    return false;
  }
}

export async function generateBallConfigFromAI(playerName: string, forcedTeamName?: string, forcedTeamLogo?: string): Promise<BallConfig> {
  if (!isAiEnabled || !currentApiKey) return DEFAULT_BALL_CONFIG;

  const genAI = new GoogleGenerativeAI(currentApiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const teamContext = forcedTeamName ? `The player is currently playing for/associated with the team "${forcedTeamName}" (symbol: ${forcedTeamLogo || 'N/A'}).` : "";
  
  const prompt = `
    You are a professional basketball equipment designer. 
    Create a personalized basketball configuration for the player: "${playerName}".
    ${teamContext}
    
    The configuration must reflect the player's style of play, history, and personality.
    If a team was provided, incorporate its colors and spirit.

    Return a JSON object matching the BallConfig interface:
    {
      "sizePreset": "mini" | "normal" | "large" | "giant",
      "scale": number (0.5 to 2.0),
      "style": "pro" | "street" | "playground" | "vintage" | "futuristic" | "training" | "team",
      "primaryColor": string (hex),
      "lineColor": string (hex),
      "glowColor": string (hex),
      "material": "leather" | "rubber" | "synthetic" | "chrome" | "lava" | "ice" | "energy" | "metal",
      "roughness": number (0 to 1),
      "metalness": number (0 to 1),
      "grooveThickness": number (1 to 5),
      "showGlow": boolean,
      "printText": string (up to 8 chars),
      "printedNumber": string (up to 2 chars, usually player jersey number),
      "playerName": string (The full name of the player),
      "trailType": "none" | "smoke" | "fire" | "electric" | "neon" | "particles",
      "onPointEffect": "none" | "explosion" | "confetti" | "implosion",
      "auraType": "none" | "legendary" | "shadow" | "holy",
      "rotationSpeedMultiplier": number (0.5 to 2.0),
      "reflectionIntensity": number (0 to 1),
      "hp": number (50 to 200),
      "maxHp": 200,
      "energy": number (50 to 200),
      "maxEnergy": 200,
      "airLevel": number (0.5 to 1.0),
      "maxAirLevel": 1.0,
      "knockbackForce": number (0 to 10),
      "weight": number (0 to 10),
      "bounciness": number (0 to 10),
      "speed": number (0 to 10),
      "rarity": "common" | "rare" | "epic" | "legendary",
      "teamName": string (current or most famous team of the player. Use "${forcedTeamName}" if provided),
      "teamLogo": string (an emoji representing the team or player's spirit. Use "${forcedTeamLogo}" if provided)
    }
    
    Ensure the mechanics (knockback, weight, bounciness, speed) balance each other and suit the player (e.g., Shaq should have high weight, Curry high bounciness/speed, Jordan legendary aura).
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const config = JSON.parse(text);
    
    return {
      ...DEFAULT_BALL_CONFIG,
      ...config,
      isUnlocked: true,
    };
  } catch (error) {
    console.error("Error generating ball config:", error);
    return DEFAULT_BALL_CONFIG;
  }
}
