import { NextRequest } from 'next/server';
import { LLMProvider } from '@/lib/providers/config';
import { createProviderClient } from '@/lib/providers/provider';

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body
    const { prompt, model, provider: providerParam } = await request.json();

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

    // Generate code with the selected provider
    const stream = await providerClient.generateCode(prompt, model);

    // Return the stream as response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating code:', error);

    // Return an error response
    return new Response(
      JSON.stringify({ error: 'Error generating code' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
