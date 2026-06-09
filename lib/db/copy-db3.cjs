const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wandr')
  .then(async () => {
    const wandrDb = mongoose.connection.useDb('wandr');
    const docs = await wandrDb.collection('customdestinations').find({}).toArray();
    for (const doc of docs) {
      delete doc._id;
      await wandrDb.collection('customdests').updateOne(
        { slug: doc.slug },
        { $set: doc },
        { upsert: true }
      );
    }
    console.log('Copied docs to customdests!');
    process.exit(0);
  });
