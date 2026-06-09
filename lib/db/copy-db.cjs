const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wandr')
  .then(async () => {
    const defaultDb = mongoose.connection.useDb('test');
    const wandrDb = mongoose.connection.useDb('wandr');
    
    const docs = await defaultDb.collection('customdestinations').find({}).toArray();
    if (docs.length > 0) {
      for (const doc of docs) {
        await wandrDb.collection('customdestinations').updateOne(
          { slug: doc.slug },
          { $set: doc },
          { upsert: true }
        );
      }
      console.log('Successfully copied', docs.length, 'documents from test DB to wandr DB!');
    }
    process.exit(0);
  });
