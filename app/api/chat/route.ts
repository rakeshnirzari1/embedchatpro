import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import connectDB from '@/lib/db';
import BotSettings from '@/lib/models/BotSettings';
import User from '@/lib/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { botId, message } = await request.json();

    if (!botId || !message) {
      return NextResponse.json(
        { error: 'Bot ID and message are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    await connectDB();

    // Get user's OpenAI API key
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Check if user has OpenAI API key
    if (!user.openaiApiKey) {
      return NextResponse.json(
        { 
          error: '⚠️ API Key Required. Please add your OpenAI API key in Settings to use this bot. Go to Settings and add your API key to continue.' 
        },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Initialize OpenAI with user's API key
    const openai = new OpenAI({
      apiKey: user.openaiApiKey,
    });

    // Find bot settings
    const botSettings = await BotSettings.findOne({ botId });
    
    if (!botSettings) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Build comprehensive knowledge base from all sources
    let knowledgeBase = '';

    // Add FAQs
    if (botSettings.faqs.length > 0) {
      knowledgeBase += 'FAQs:\n' + botSettings.faqs.join('\n\n') + '\n\n';
    }

    // Add enabled documents
    const enabledDocuments = botSettings.documents?.filter((doc: any) => doc.enabled) || [];
    if (enabledDocuments.length > 0) {
      knowledgeBase += 'Document Knowledge Base:\n';
      enabledDocuments.forEach((doc: any) => {
        knowledgeBase += `\n--- ${doc.name} (${doc.type.toUpperCase()}) ---\n`;
        knowledgeBase += doc.content + '\n';
      });
      knowledgeBase += '\n';
    }

    // Add enabled URLs
    const enabledUrls = botSettings.urls?.filter((url: any) => url.enabled) || [];
    if (enabledUrls.length > 0) {
      knowledgeBase += 'Web Content Knowledge Base:\n';
      enabledUrls.forEach((url: any) => {
        knowledgeBase += `\n--- ${url.title} (${url.url}) ---\n`;
        knowledgeBase += url.content + '\n';
      });
      knowledgeBase += '\n';
    }

    // Add enabled structured data
    const enabledStructuredData = botSettings.structuredData?.filter((data: any) => data.enabled) || [];
    if (enabledStructuredData.length > 0) {
      knowledgeBase += 'Structured Data Knowledge Base:\n';
      enabledStructuredData.forEach((data: any) => {
        knowledgeBase += `\n--- ${data.name} (${data.type}) ---\n`;
        knowledgeBase += JSON.stringify(data.data, null, 2) + '\n';
      });
      knowledgeBase += '\n';
    }

    if (!knowledgeBase.trim()) {
      knowledgeBase = 'No knowledge base available.';
    }

    const systemPrompt = `You are a helpful chatbot named ${botSettings.name}.

Knowledge Base:
${knowledgeBase}

Instructions:
- Answer questions based on the comprehensive knowledge base provided above
- Be helpful, friendly, and professional
- If you don't know the answer based on the provided information, politely say "I don't have information about that in my knowledge base. Please contact support for more assistance."
- Keep responses concise and relevant
- Use the bot's name: ${botSettings.name}
- When referencing information, mention the source if possible (e.g., "According to our FAQ" or "Based on our documentation")`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json(
      { reply },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Check if it's an API key error
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('API') || errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'Please enter your OpenAI API key in settings to start chatting' },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }
    
    return NextResponse.json(
      { error: 'Sorry, I encountered an error. Please try again later.' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
