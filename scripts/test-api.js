const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../functions/.env' });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function testAPI() {
  console.log('Testing Google AI API...');
  console.log('API Key:', process.env.GOOGLE_AI_API_KEY ? '✓ Found' : '✗ Missing');

  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

  for (const modelName of models) {
    try {
      console.log(`\nTrying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "test successful" if you can read this.');
      const response = result.response.text();
      console.log(`✓ SUCCESS with ${modelName}`);
      console.log('Response:', response);
      return modelName; // Return the working model
    } catch (error) {
      console.log(`✗ FAILED with ${modelName}:`, error.message.substring(0, 100));
    }
  }

  console.log('\n✗ No models worked!');
  return null;
}

testAPI().then(workingModel => {
  if (workingModel) {
    console.log(`\n✓ Use this model in your script: ${workingModel}`);
  }
  process.exit(workingModel ? 0 : 1);
});
