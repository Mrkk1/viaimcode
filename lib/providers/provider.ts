import OpenAI from 'openai';
import { LLMProvider, getProviderApiKey, getProviderBaseUrl } from './config';

// Shared system prompt for all providers
export const SYSTEM_PROMPT = `You are an expert web developer AI specializing in modern, beautiful web interfaces. Your task is to generate a single, self-contained HTML file using Tailwind CSS based on the user's prompt.

REQUIREMENTS:
1. Include Tailwind CSS via CDN in the <head> section:
   <script src="https://cdn.tailwindcss.com"></script>

2. Use semantic HTML5 elements (header, nav, main, section, article, footer, etc.)

3. Apply Tailwind CSS utility classes for ALL styling:
   - Use Tailwind's color palette (bg-blue-500, text-gray-700, etc.)
   - Apply proper spacing (p-4, m-8, gap-6, space-y-4, etc.)
   - Implement responsive design with breakpoints (sm:, md:, lg:, xl:)
   - Add transitions and hover effects (transition-all, hover:scale-105, etc.)
   - Include rounded corners and shadows (rounded-lg, shadow-xl, etc.)

4. Create a modern, visually appealing design with:
   - Clean typography (text-xl, font-semibold, leading-relaxed)
   - Proper contrast ratios for accessibility
   - Mobile-first responsive approach
   - Interactive elements with hover and focus states

5. Include JavaScript within <script> tags at the end of <body> if needed

6. For similar or repeated elements (such as cards, buttons, list items, sections, etc.), assign unique IDs to each element for better identification and potential JavaScript interaction. Use descriptive naming conventions like "card-1", "card-2", "btn-submit", "section-hero", etc.

IMPORTANT: Do NOT use markdown formatting. Do NOT wrap the code in \`\`\`html and \`\`\` tags. Do NOT output any text or explanation before or after the HTML code. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>.`;

// Common interface for all providers
export interface LLMProviderClient {
  getModels: () => Promise<{ id: string; name: string }[]>;
  generateCode: (prompt: string, model: string, customSystemPrompt?: string | null, maxTokens?: number) => Promise<ReadableStream<Uint8Array>>;
}

// Factory function to create a provider client
export function createProviderClient(provider: LLMProvider): LLMProviderClient {
  switch (provider) {
    case LLMProvider.DEEPSEEK:
      return new OpenAICompatibleProvider(LLMProvider.DEEPSEEK);
    case LLMProvider.OPENAI_COMPATIBLE:
      return new OpenAICompatibleProvider(LLMProvider.OPENAI_COMPATIBLE);
    case LLMProvider.OLLAMA:
      return new OllamaProvider();
    case LLMProvider.LM_STUDIO:
      return new LMStudioProvider();
    case LLMProvider.KIMI:
      return new OpenAICompatibleProvider(LLMProvider.KIMI);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// OpenAI-compatible provider (OpenAI, Kluster.ai, Mistral, etc.)
class OpenAICompatibleProvider implements LLMProviderClient {
  private client: OpenAI;
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
    this.client = new OpenAI({
      apiKey: getProviderApiKey(provider) || '',
      baseURL: getProviderBaseUrl(provider),
    });
  }

  async getModels() {
    const response = await this.client.models.list();

    // Remove duplicates based on model ID
    const uniqueModels = Array.from(
      new Map(response.data.map(model => [model.id, model])).values()
    );

    return uniqueModels.map((model) => ({
      id: model.id,
      name: model.id,
    }));
  }

  async generateCode(prompt: string, model: string, customSystemPrompt?: string | null, maxTokens?: number) {
    // Use custom system prompt if provided, otherwise use default
    const systemPromptToUse = customSystemPrompt || SYSTEM_PROMPT;

    const stream = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPromptToUse },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens || undefined, // Use maxTokens if provided, otherwise let the API decide
      stream: true,
    });

    // Create a ReadableStream for the response
    const textEncoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        // Process the stream from OpenAI
        for await (const chunk of stream) {
          // Extract the text from the chunk
          const content = chunk.choices[0]?.delta?.content || '';

          // Send the text to the client
          controller.enqueue(textEncoder.encode(content));
        }
        controller.close();
      },
    });
  }
}

// Ollama Provider implementation
class OllamaProvider implements LLMProviderClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getProviderBaseUrl(LLMProvider.OLLAMA);
  }

  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Error fetching Ollama models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models ? data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
      })) : [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      throw new Error('Cannot connect to Ollama. Is the server running?');
    }
  }

  async generateCode(prompt: string, model: string, customSystemPrompt?: string | null, maxTokens?: number) {
    // Use custom system prompt if provided, otherwise use default
    const systemPromptToUse = customSystemPrompt || SYSTEM_PROMPT;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: `${systemPromptToUse}\n\nUser request: ${prompt}`,
          stream: true,
          options: maxTokens ? { num_predict: maxTokens } : undefined, // Ollama uses num_predict for max tokens
        }),
      });

      if (!response.ok) {
        throw new Error(`Error generating code with Ollama: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response received from Ollama server');
      }

      // Create a ReadableStream for the response
      const textEncoder = new TextEncoder();
      return new ReadableStream({
        async start(controller) {
          const reader = response.body!.getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                controller.close();
                break;
              }

              // Convert the chunk to text
              const chunk = new TextDecoder().decode(value);

              try {
                // Ollama returns JSON objects separated by line breaks
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                  const data = JSON.parse(line);
                  if (data.response) {
                    controller.enqueue(textEncoder.encode(data.response));
                  }
                }
              } catch (e) {
                // If parsing fails, send the raw text
                controller.enqueue(textEncoder.encode(chunk));
              }
            }
          } catch (error) {
            console.error('Error reading Ollama stream:', error);
            controller.error(error);
          }
        }
      });
    } catch (error) {
      console.error('Error generating code with Ollama:', error);
      throw error;
    }
  }
}

// LM Studio Provider implementation
class LMStudioProvider implements LLMProviderClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: 'lm-studio', // LM Studio accepts any API key
      baseURL: getProviderBaseUrl(LLMProvider.LM_STUDIO),
    });
  }

  async getModels() {
    try {
      const response = await this.client.models.list();
      return response.data.map((model) => ({
        id: model.id,
        name: model.id,
      }));
    } catch (error) {
      console.error('Error fetching LM Studio models:', error);
      throw new Error('Cannot connect to LM Studio. Is the server running?');
    }
  }

  async generateCode(prompt: string, model: string, customSystemPrompt?: string | null, maxTokens?: number) {
    // Use custom system prompt if provided, otherwise use default
    const systemPromptToUse = customSystemPrompt || SYSTEM_PROMPT;

    const stream = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPromptToUse },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens || undefined, // Use maxTokens if provided, otherwise let the API decide
      stream: true,
    });

    // Create a ReadableStream for the response
    const textEncoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        // Process the stream from OpenAI
        for await (const chunk of stream) {
          // Extract the text from the chunk
          const content = chunk.choices[0]?.delta?.content || '';

          // Send the text to the client
          controller.enqueue(textEncoder.encode(content));
        }
        controller.close();
      },
    });
  }
}
