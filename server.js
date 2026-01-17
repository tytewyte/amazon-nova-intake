const express = require('express');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('.')); // Serve HTML files from current directory

// Initialize AWS Bedrock client
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// POST /intake - Main intake endpoint
app.post('/intake', async (req, res) => {
  try {
    console.log('Received intake:', req.body);
    
    const intakeData = req.body;
    
    // Create prompt for Amazon Nova
    const prompt = `You are an AI legal intake assistant. Generate a professional attorney summary based on this client intake:

Client Name: ${intakeData.client_name}
Email: ${intakeData.email}
Phone: ${intakeData.phone}
Case Type: ${intakeData.case_type}
Case Summary: ${intakeData.summary}
Urgency: ${intakeData.urgency || 'Medium'}

Generate a concise attorney brief that includes:
1. Client overview
2. Case type and key facts
3. Urgency assessment
4. Recommended next steps
5. Any red flags or missing information

Keep it professional and under 300 words.`;

    // Call Amazon Nova via Bedrock
    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-lite-v1:0', // Using Nova Lite for speed and cost
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }]
          }
        ],
        inferenceConfig: {
          max_new_tokens: 500,
          temperature: 0.7
        }
      })
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const summary = responseBody.output.message.content[0].text;

    console.log('Nova generated summary:', summary);

    // Return the result
    res.json({
      success: true,
      intake: intakeData,
      attorney_summary: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing intake:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Amazon Nova Intake System' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Amazon Nova Intake System running on http://localhost:${PORT}`);
  console.log(`📋 Open intake.html in your browser to test`);
});
