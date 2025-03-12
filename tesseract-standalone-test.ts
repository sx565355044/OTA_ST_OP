import { createWorker } from 'tesseract.js';
import path from 'path';

async function testTesseract() {
  try {
    console.log('Testing Tesseract.js v6 standalone functionality');
    
    // Image file to process
    const imagePath = path.resolve('./uploads/screenshots-1741790537086-94523272.png');
    console.log('Image path:', imagePath);
    
    // Create a worker with simplified options
    console.log('Creating Tesseract worker...');
    const worker = await createWorker('eng+chi_sim', {
      logger: m => console.log('Progress:', typeof m === 'object' ? JSON.stringify(m) : m)
    });
    
    console.log('Worker created, starting recognition...');
    
    // Perform OCR
    const { data } = await worker.recognize(imagePath);
    
    // Output results
    console.log('\n--- OCR RESULTS ---');
    console.log('Confidence:', data.confidence);
    console.log('Text length:', data.text.length);
    console.log('First 100 chars:', data.text.substring(0, 100));
    
    // Clean up
    await worker.terminate();
    console.log('Worker terminated');
  } catch (error) {
    console.error('Tesseract standalone test failed:', error);
  }
}

testTesseract();