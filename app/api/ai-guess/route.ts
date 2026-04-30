import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-3-flash-preview";

function base64ToParts(base64Data: string) {
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    return { mimeType: "image/png", data: base64Data };
  }
  return { mimeType: matches[1], data: matches[2] };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const body = await request.json();
    const { imageData, secretWord } = body;

    if (!imageData) {
      return NextResponse.json({ error: "Missing imageData" }, { status: 400 });
    }

    if (!secretWord || !secretWord.trim()) {
      return NextResponse.json({ error: "Missing secretWord" }, { status: 400 });
    }

    const { mimeType, data } = base64ToParts(imageData);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const visionPrompt = `这是一个"你画我猜"游戏中的绘图。请仔细观察这张图片，用简洁的中文描述图中画的是什么物体或概念。只返回最可能的答案，不要解释，不要添加其他内容。如果不确定，也请给出你最可能的猜测。`;

    const visionResult = await model.generateContent([
      {
        inlineData: {
          data,
          mimeType,
        },
      },
      visionPrompt,
    ]);

    const aiGuess = visionResult.response.text().trim();

    const comparePrompt = `请判断以下两个描述是否指的是同一个事物或概念：

预设答案（用户设定的正确答案）："${secretWord}"
AI 猜测（AI 从图片中识别出的内容）："${aiGuess}"

请分析这两个描述的含义：
1. 如果它们指的是同一个事物（例如"苹果"和"一个红色的苹果"，"猫"和"猫咪"，"房子"和"建筑物"），请返回：一致
2. 如果它们明显指的是不同事物（例如"苹果"和"香蕉"，"猫"和"狗"），请返回：不一致

只返回"一致"或"不一致"这两个词中的一个，不要添加任何其他内容或解释。`;

    const compareResult = await model.generateContent([comparePrompt]);
    const comparisonText = compareResult.response.text().trim();
    const isMatch = comparisonText.includes("一致");

    return NextResponse.json({
      success: true,
      model: GEMINI_MODEL,
      secretWord,
      debug: {
        visionPrompt,
        visionResponse: aiGuess,
        comparePrompt,
        compareResponse: comparisonText,
      },
      result: {
        aiGuess,
        isMatch,
        comparison: comparisonText,
      },
    });
  } catch (error) {
    console.error("AI Guess API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}
