import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    system:
      "You are a helpful assistant in a document canvas. Provide detailed, well-formatted responses that would look good in a document. Use markdown formatting when appropriate.",
  })

  return result.toDataStreamResponse()
}

