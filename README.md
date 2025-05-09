# AI Code Generator

![AI Code Generator](public/screenshot.png)

A modern web application that uses AI to generate HTML, CSS, and JavaScript code based on natural language prompts. Simply describe what you want to build, and the AI will create a complete, self-contained web page for you.

## Features

- **AI-Powered Code Generation**: Generate complete web pages from text descriptions
- **Live Preview**: See your generated code in action with desktop, tablet, and mobile views
- **Code Editing**: Edit the generated code directly in the browser
- **Multiple AI Providers**: Support for DeepSeek, custom OpenAI-compatible APIs, and local models
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, dark-themed interface with a focus on usability

## Tech Stack

- [Next.js 15](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [OpenAI SDK](https://github.com/openai/openai-node) (for API compatibility)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.17 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- An API key from one of the supported providers (see below)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ai-code-generator.git
   cd ai-code-generator
   ```

2. Install the dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory and add your API key:
   ```
   # Choose one of the following providers:

   # DeepSeek API
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   DEEPSEEK_API_BASE=https://api.deepseek.com/v1

   # Custom OpenAI-compatible API
   # OPENAI_COMPATIBLE_API_KEY=your_api_key_here
   # OPENAI_COMPATIBLE_API_BASE=https://api.openai.com/v1

   # Default Provider (deepseek, openai_compatible, ollama, lm_studio)
   DEFAULT_PROVIDER=deepseek
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supported AI Providers

### DeepSeek

1. Visit [DeepSeek](https://platform.deepseek.com) and create an account or sign in.
2. Navigate to the API keys section.
3. Create a new API key and copy it.
4. Set in your `.env.local` file:
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key
   DEEPSEEK_API_BASE=https://api.deepseek.com/v1
   ```

### Custom OpenAI-compatible API

You can use any OpenAI-compatible API:

1. Obtain an API key from your desired provider (OpenAI, Together AI, Groq, etc.).
2. Set in your `.env.local` file:
   ```
   OPENAI_COMPATIBLE_API_KEY=your_api_key
   OPENAI_COMPATIBLE_API_BASE=https://api.of.provider.com/v1
   ```

### Local Models

#### Ollama

1. Install [Ollama](https://ollama.ai/) on your local machine.
2. Pull a model like `llama2` or `codellama`.
3. Start the Ollama server.
4. Set in your `.env.local` file:
   ```
   OLLAMA_API_BASE=http://localhost:11434
   DEFAULT_PROVIDER=ollama
   ```

#### LM Studio

1. Install [LM Studio](https://lmstudio.ai/) on your local machine.
2. Download a model and start the local server.
3. Set in your `.env.local` file:
   ```
   LM_STUDIO_API_BASE=http://localhost:1234/v1
   DEFAULT_PROVIDER=lm_studio
   ```

## Deployment

### Deploying on Vercel

[Vercel](https://vercel.com) is the recommended platform for hosting your Next.js application:

1. Create an account on Vercel and connect it to your GitHub account.
2. Import your repository.
3. Add the environment variables for your desired provider, e.g.:
   - `DEEPSEEK_API_KEY`
   - `DEEPSEEK_API_BASE`
   - `DEFAULT_PROVIDER`
4. Click "Deploy".

### Other Hosting Options

The application can also be deployed on:
- [Netlify](https://netlify.com)
- [Cloudflare Pages](https://pages.cloudflare.com)
- Any platform that supports Next.js applications

## Usage

1. Enter a prompt describing what kind of website you want to create.
2. Select an AI provider and model from the dropdown menu.
3. Click "GENERATE".
4. Wait for the code to be generated.
5. View the live preview and adjust the viewport (Desktop, Tablet, Mobile).
6. Toggle edit mode to modify the code if needed.
7. Copy the code or download it as an HTML file.

## Roadmap

### AI Models and Providers
- [x] Integration with [Ollama](https://ollama.ai) for local model execution
- [x] Support for [LM Studio](https://lmstudio.ai) to use local models
- [x] Predefined provider: DeepSeek
- [x] Custom OpenAI-compatible API support
- [ ] Offline mode for usage without internet connection
- [ ] Saving custom provider configurations
- [ ] Adding more predefined providers (Anthropic, Groq, etc.)

### Advanced Code Generation
- [ ] Generation of React components
- [ ] TypeScript support
- [ ] Backend code generation (Node.js, Express)
- [ ] Save and load projects

### UI/UX Improvements
- [ ] Dark/Light theme toggle
- [ ] Customizable code editor settings
- [ ] Drag-and-drop interface for UI components
- [ ] History of generated code

### Collaboration
- [ ] Real-time collaboration with other users
- [ ] Sharing generated projects
- [ ] Comments and feedback system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful UI components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor
- All the AI providers that make this project possible
