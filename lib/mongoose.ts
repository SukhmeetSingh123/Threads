import mongoose from 'mongoose';

let isConnect =false;
export const connectToDB =async ()=>{
    mongoose.set('strictQuery',true);
    if( !process.env.MONGODB_URL) return console.log('MONGOOSE_URL not found');
    if(isConnect) return console.log('Already connected to MongoDB');

    try{
        await mongoose.connect(process.env.MONGODB_URL);
        isConnect=true;
        console.log('Connected To MongoDb');
    }catch(error){
        console.log(error);
    }
}