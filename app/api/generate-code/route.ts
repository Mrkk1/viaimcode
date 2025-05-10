import { NextRequest } from 'next/server';
import { LLMProvider } from '@/lib/providers/config';
import { createProviderClient } from '@/lib/providers/provider';

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body
    const { prompt, model, provider: providerParam, customSystemPrompt } = await request.json();

    // Check if prompt and model are provided
    if (!prompt || !model) {
      return new Response(
        JSON.stringify({ error: 'Prompt and model are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine the provider to use
    let provider: LLMProvider;

    if (providerParam && Object.values(LLMProvider).includes(providerParam as LLMProvider)) {
      provider = providerParam as LLMProvider;
    } else {
      // Use the default provider from environment variables or DeepSeek as fallback
      provider = (process.env.DEFAULT_PROVIDER as LLMProvider) || LLMProvider.DEEPSEEK;
    }

    // Create the provider client
    const providerClient = createProviderClient(provider);

    // Generate code with the selected provider and custom system prompt if provided
    const stream = await providerClient.generateCode(prompt, model, customSystemPrompt || null);

    // Return the stream as response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating code:', error);

    // Return a more specific error message if available
    const errorMessage = error instanceof Error ? error.message : 'Error generating code';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
