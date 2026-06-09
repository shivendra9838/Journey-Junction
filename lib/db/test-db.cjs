const mongoose = require('mongoose');

async function test() {
  try {
    console.log('Connecting...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wandr');
    console.log('Connected!');
    
    const CustomDestModel = mongoose.model('CustomDest', new mongoose.Schema({ isPublished: Boolean }, { strict: false }));
    const docs = await CustomDestModel.find({ isPublished: true }).lean();
    console.log('Docs found:', docs.length);
    if (docs.length > 0) {
      console.log('First doc name:', docs[0].name);
      console.log('isPublished type:', typeof docs[0].isPublished);
    }
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

test();
