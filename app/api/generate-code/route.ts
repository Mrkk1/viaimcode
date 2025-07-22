import { NextRequest } from 'next/server';
import { LLMProvider } from '@/lib/providers/config';
import { createProviderClient } from '@/lib/providers/provider';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证用户是否登录
    const user = await getCurrentUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: '请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON body
    const { prompt, model, provider: providerParam, customSystemPrompt, maxTokens } = await request.json();

    // Check if prompt and model are provided
    if (!prompt || !model) {
      return new Response(
        JSON.stringify({ error: 'Prompt and model are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse maxTokens as a number if it's provided
    const parsedMaxTokens = maxTokens ? parseInt(maxTokens.toString(), 10) : undefined;

    // Determine the provider to use
    let provider: LLMProvider;

    if (providerParam && Object.values(LLMProvider).includes(providerParam as LLMProvider)) {
      provider = providerParam as LLMProvider;
    } else {
      // Use the default provider from environment variables or Kimi as fallback
      provider = (process.env.DEFAULT_PROVIDER as LLMProvider) || LLMProvider.KIMI;
    }

    // Create the provider client
    const providerClient = createProviderClient(provider);

    // Generate code with the selected provider and custom system prompt if provided
    const stream = await providerClient.generateCode(prompt, model, customSystemPrompt || null, parsedMaxTokens);

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
