import OpenAI from 'openai';
import { LLMProvider, getProviderApiKey, getProviderBaseUrl } from './config';

// Common interface for all providers
export interface LLMProviderClient {
  getModels: () => Promise<{ id: string; name: string }[]>;
  generateCode: (prompt: string, model: string) => Promise<ReadableStream<Uint8Array>>;
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

  async generateCode(prompt: string, model: string) {
    const systemPrompt = "You are an expert web developer AI. Your task is to generate a single, self-contained HTML file based on the user's prompt. This HTML file must include all necessary HTML structure, CSS styles within <style> tags in the <head>, and JavaScript code within <script> tags, preferably at the end of the <body>. IMPORTANT: Do NOT use markdown formatting. Do NOT wrap the code in ```html and ``` tags. Do NOT output any text or explanation before or after the HTML code. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>. Ensure the generated CSS and JavaScript are directly embedded in the HTML file.";

    const stream = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
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
      return [
        { id: 'llama2', name: 'Llama 2' },
        { id: 'mistral', name: 'Mistral' },
        { id: 'codellama', name: 'Code Llama' },
      ];
    }
  }

  async generateCode(prompt: string, model: string) {
    const systemPrompt = "You are an expert web developer AI. Your task is to generate a single, self-contained HTML file based on the user's prompt. This HTML file must include all necessary HTML structure, CSS styles within <style> tags in the <head>, and JavaScript code within <script> tags, preferably at the end of the <body>. IMPORTANT: Do NOT use markdown formatting. Do NOT wrap the code in ```html and ``` tags. Do NOT output any text or explanation before or after the HTML code. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>. Ensure the generated CSS and JavaScript are directly embedded in the HTML file.";

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: `${systemPrompt}\n\nUser request: ${prompt}`,
          stream: true,
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
      // Fallback in case the model list cannot be retrieved
      return [
        { id: 'local-model', name: 'Local Model (LM Studio)' },
        { id: 'mistral-7b', name: 'Mistral 7B' },
        { id: 'llama-2-7b', name: 'Llama 2 7B' },
        { id: 'codellama-7b', name: 'CodeLlama 7B' }
      ];
    }
  }

  async generateCode(prompt: string, model: string) {
    const systemPrompt = "You are an expert web developer AI. Your task is to generate a single, self-contained HTML file based on the user's prompt. This HTML file must include all necessary HTML structure, CSS styles within <style> tags in the <head>, and JavaScript code within <script> tags, preferably at the end of the <body>. IMPORTANT: Do NOT use markdown formatting. Do NOT wrap the code in ```html and ``` tags. Do NOT output any text or explanation before or after the HTML code. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>. Ensure the generated CSS and JavaScript are directly embedded in the HTML file.";

    const stream = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
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
