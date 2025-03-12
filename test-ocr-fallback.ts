import { processImage } from './server/utils/ocr-processor';
import path from 'path';

async function testOcrFallback() {
  try {
    // Use an existing image from the uploads folder
    const imagePath = path.resolve('./uploads/screenshots-1741790537086-94523272.png');
    console.log('Testing OCR processing with fallback on image:', imagePath);
    
    // Process the image
    const result = await processImage(imagePath);
    
    // Log the results
    console.log('OCR Result:');
    console.log('- Source:', result.ocrEngine);
    console.log('- Platform:', result.detectedPlatform ? 
      `${result.detectedPlatform.name} (${result.detectedPlatform.confidence}%)` : 'Unknown');
    console.log('- Extracted Data:', JSON.stringify(result.extractedData, null, 2));
    console.log('- Text Length:', result.text.length);
    console.log('- Confidence:', result.confidence);
    
    // Check if any errors
    if (result.error) {
      console.log('ERROR:', result.extractedData.errorMessage);
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testOcrFallback();